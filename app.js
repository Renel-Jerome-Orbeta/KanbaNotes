/**
 * Loads board columns and tasks from browser LocalStorage, or falls back to
 * default initial state if no stored data exists. Serves as the single source of truth.
 */
let columns = loadColumnsFromLocalStorage();
let tasks = loadTasksFromLocalStorage();

// Tracks the ID of the task currently being edited (null if creating a new task)
let editingTaskId = null;

// Tracks the current search query string for real-time filtering without altering state
let searchQuery = '';

// Tracks the selected priority filter ('all', 'low', 'medium', 'high') without altering state
let selectedPriority = 'all';

/**
 * Generates a URL-friendly unique status slug from a column title so new columns
 * can act as drop zones and task status keys without colliding with existing columns.
 * 
 * @param {string} title - Human-readable column title.
 * @returns {string} Unique status key.
 */
function generateColumnId(title) {
    const baseSlug = title
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') || 'column';

    let candidate = baseSlug;
    let counter = 2;
    while (columns.some(col => col.id === candidate)) {
        candidate = `${baseSlug}-${counter}`;
        counter += 1;
    }
    return candidate;
}

/**
 * Retrieves columns stored in localStorage under the 'kanban_columns' key,
 * or returns the default three Kanban columns.
 * 
 * @returns {Array} An array of column objects ({ id, title }).
 */
function loadColumnsFromLocalStorage() {
    const storedColumns = localStorage.getItem('kanban_columns');
    if (storedColumns) {
        try {
            const parsed = JSON.parse(storedColumns);
            if (Array.isArray(parsed) && parsed.length > 0) {
                return parsed;
            }
        } catch (e) {
            console.error('Failed to parse columns from localStorage:', e);
        }
    }
    return [
        { id: 'todo', title: 'To Do' },
        { id: 'inprogress', title: 'In Progress' },
        { id: 'done', title: 'Done' }
    ];
}

/**
 * Persists the current columns array into browser LocalStorage.
 */
function saveColumnsToLocalStorage() {
    localStorage.setItem('kanban_columns', JSON.stringify(columns));
}

/**
 * Retrieves tasks stored in localStorage under the 'kanban_tasks' key and normalizes
 * missing priority fields so older saved data remains compatible.
 * 
 * @returns {Array} An array of task objects.
 */
function loadTasksFromLocalStorage() {
    const storedTasks = localStorage.getItem('kanban_tasks');
    if (storedTasks) {
        try {
            const parsed = JSON.parse(storedTasks);
            if (Array.isArray(parsed)) {
                return parsed.map(task => ({
                    ...task,
                    priority: task.priority || 'medium'
                }));
            }
        } catch (e) {
            console.error('Failed to parse tasks from localStorage:', e);
        }
    }
    // Default initial tasks if storage is empty or invalid
    return [
        {
            id: '1',
            title: 'Design UI Wireframe',
            description: 'Sketch out columns and card components.',
            priority: 'high',
            status: 'todo'
        },
        {
            id: '2',
            title: 'Setup Repository',
            description: 'Initialize git and basic file structure.',
            priority: 'medium',
            status: 'inprogress'
        },
        {
            id: '3',
            title: 'Project Planning',
            description: 'Define requirements and timeline.',
            priority: 'low',
            status: 'done'
        }
    ];
}

/**
 * Persists the current tasks array into browser LocalStorage.
 */
function saveTasksToLocalStorage() {
    localStorage.setItem('kanban_tasks', JSON.stringify(tasks));
}

/**
 * Synchronizes the task modal's status <select> options with the current columns array.
 * 
 * @param {string} [preferredStatus] - Optional status value to select if available.
 */
function syncStatusSelectOptions(preferredStatus) {
    const statusSelect = document.getElementById('task-status');
    if (!statusSelect) return;

    const currentSelection = preferredStatus || statusSelect.value;
    statusSelect.innerHTML = '';

    columns.forEach(col => {
        const option = document.createElement('option');
        option.value = col.id;
        option.textContent = col.title;
        statusSelect.appendChild(option);
    });

    if (columns.some(col => col.id === currentSelection)) {
        statusSelect.value = currentSelection;
    } else if (columns.length > 0) {
        statusSelect.value = columns[0].id;
    }
}

/**
 * Adds a new column to the board state, saves to localStorage, re-renders columns
 * and tasks, and refreshes the modal status dropdown.
 * 
 * @param {string} title - Title of the new column.
 */
function addColumn(title) {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) return;

    const newColumn = {
        id: generateColumnId(trimmedTitle),
        title: trimmedTitle
    };

    columns.push(newColumn);
    saveColumnsToLocalStorage();
    renderBoard();
    syncStatusSelectOptions();
}

/**
 * Deletes a column only when it contains zero tasks in the tasks state array.
 * Alerts the user if tasks still exist in that column so work is never accidentally lost.
 * 
 * @param {string} columnId - The unique ID/status key of the column to remove.
 */
function deleteEmptyColumn(columnId) {
    const hasTasks = tasks.some(task => task.status === columnId);
    if (hasTasks) {
        alert('Cannot delete a column that still contains tasks. Move or delete its tasks first.');
        return;
    }

    columns = columns.filter(col => col.id !== columnId);
    saveColumnsToLocalStorage();
    renderBoard();
    syncStatusSelectOptions();
}

/**
 * Sets up the header form listener for adding new dynamic columns.
 */
function setupColumnManagement() {
    const addColForm = document.getElementById('add-column-form');
    const colTitleInput = document.getElementById('new-column-title');
    if (!addColForm || !colTitleInput) return;

    addColForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const title = colTitleInput.value.trim();
        if (!title) return;

        addColumn(title);
        colTitleInput.value = '';
    });
}

/**
 * Evaluates whether a single task matches both the active search query (case-insensitive
 * across title and description) and the selected priority filter.
 * 
 * @param {Object} task - A task object from state.
 * @returns {boolean} True if the task satisfies all active filter criteria.
 */
function matchesActiveFilters(task) {
    const taskPriority = ['low', 'medium', 'high'].includes(task.priority) ? task.priority : 'medium';
    const priorityMatch = selectedPriority === 'all' || taskPriority === selectedPriority;
    if (!priorityMatch) return false;

    const query = searchQuery.trim().toLowerCase();
    if (!query) return true;

    const titleMatch = (task.title || '').toLowerCase().includes(query);
    const descMatch = (task.description || '').toLowerCase().includes(query);
    return titleMatch || descMatch;
}

/**
 * Wires up real-time input filtering on the search bar and selection changes on the
 * priority filter dropdown so cards update immediately while keeping tasks state intact.
 */
function setupFilters() {
    const searchInput = document.getElementById('search-input');
    const priorityFilter = document.getElementById('priority-filter');

    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            searchQuery = e.target.value;
            renderTasks();
        });
    }

    if (priorityFilter) {
        priorityFilter.addEventListener('change', (e) => {
            selectedPriority = e.target.value;
            renderTasks();
        });
    }
}

/**
 * Renders all column sections dynamically from the columns state array and
 * re-attaches drag-and-drop listeners to every drop zone.
 */
function renderColumns() {
    const container = document.getElementById('kanban-container');
    if (!container) return;

    container.innerHTML = '';

    columns.forEach(col => {
        const columnEl = document.createElement('section');
        columnEl.className = 'kanban-column';
        columnEl.id = `${col.id}-column`;

        const isEmpty = !tasks.some(task => task.status === col.id);
        const deleteBtnHtml = isEmpty
            ? `<button type="button" class="delete-column-btn" data-col-id="${col.id}" title="Delete empty column">Delete</button>`
            : '';

        columnEl.innerHTML = `
            <div class="column-header">
                <h2>${col.title}</h2>
                ${deleteBtnHtml}
            </div>
            <div class="task-list" data-status="${col.id}"></div>
        `;

        if (isEmpty) {
            const delColBtn = columnEl.querySelector('.delete-column-btn');
            delColBtn.addEventListener('click', () => {
                deleteEmptyColumn(col.id);
            });
        }

        container.appendChild(columnEl);
    });

    setupDropZones();
}

/**
 * Renders visible tasks (filtered by matchesActiveFilters) from the tasks array into
 * their respective columns and updates column delete button visibility if a column
 * transitions between empty and non-empty.
 * 
 * 1. Clears all existing task lists to prevent duplicate DOM nodes.
 * 2. Filters tasks using matchesActiveFilters() without mutating the tasks array.
 * 3. Iterates over matching tasks in order to build task card elements dynamically,
 *    including a color-coded priority badge.
 * 4. Appends Edit and Delete action buttons with event listeners to each card.
 * 5. Sets the draggable attribute and attaches dragstart/dragend event listeners.
 * 6. Appends each card to its matching column container based on its status.
 */
function renderTasks() {
    // 1. Clear all task lists first to prevent duplicates
    const taskLists = document.querySelectorAll('.task-list');
    taskLists.forEach(list => {
        list.innerHTML = '';
    });

    // 2. Filter tasks for display without modifying the underlying tasks state
    const visibleTasks = tasks.filter(matchesActiveFilters);

    // 3. Loop through matching tasks and build elements
    visibleTasks.forEach(task => {
        const priority = ['low', 'medium', 'high'].includes(task.priority) ? task.priority : 'medium';
        const card = document.createElement('div');
        card.className = 'task-card';
        card.draggable = true; // Makes the element natively draggable
        card.dataset.id = task.id; // Store task ID on the DOM element

        card.innerHTML = `
            <div class="task-card-header">
                <h3>${task.title}</h3>
                <span class="priority-badge priority-${priority}">${priority}</span>
            </div>
            <p>${task.description}</p>
            <div class="task-footer">
                <button class="icon-btn edit-btn" data-id="${task.id}">Edit</button>
                <button class="icon-btn delete-btn" data-id="${task.id}">Delete</button>
            </div>
        `;

        // Attach event listener for editing this specific task
        const editBtn = card.querySelector('.edit-btn');
        editBtn.addEventListener('click', () => {
            openEditModal(task.id);
        });

        // Attach event listener for deleting this specific task
        const deleteBtn = card.querySelector('.delete-btn');
        deleteBtn.addEventListener('click', () => {
            deleteTask(task.id);
        });

        /**
         * Handle dragstart event:
         * - Packages the unique task ID into dataTransfer so it can be read later.
         * - Adds the '.dragging' CSS class after a tiny timeout to ensure smooth visual feedback.
         */
        card.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/plain', task.id);
            
            setTimeout(() => {
                card.classList.add('dragging');
            }, 0);
        });

        /**
         * Handle dragend event:
         * - Cleans up by removing the '.dragging' CSS class when the drag action finishes or is canceled.
         */
        card.addEventListener('dragend', () => {
            card.classList.remove('dragging');
        });

        // 4. Find the correct column container using the status and append the card
        const container = document.querySelector(`.task-list[data-status="${task.status}"]`);
        if (container) {
            container.appendChild(card);
        }
    });
}

/**
 * Renders both the dynamic columns and their filtered task cards in sequence.
 */
function renderBoard() {
    renderColumns();
    renderTasks();
}

/**
 * Determines which non-dragging task card in a column lies immediately below
 * the current vertical pointer position (clientY).
 * 
 * @param {HTMLElement} container - The .task-list drop zone container.
 * @param {number} clientY - The vertical mouse/drag coordinate in the viewport.
 * @returns {HTMLElement|null} The card element to insert before, or null to append at the end.
 */
function getDragAfterElement(container, clientY) {
    const draggableCards = [...container.querySelectorAll('.task-card:not(.dragging)')];

    return draggableCards.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        // Distance from the pointer to the vertical center of the card
        const offset = clientY - (box.top + box.height / 2);

        // We only care about cards whose center is below the cursor (negative offset)
        // and is closer to the cursor than any previous match
        if (offset < 0 && offset > closest.offset) {
            return { offset: offset, element: child };
        }
        return closest;
    }, { offset: Number.NEGATIVE_INFINITY, element: null }).element;
}

/**
 * Synchronizes the tasks array order with the current visual order of cards
 * across all columns and updates each task's status to match its column, while
 * preserving any tasks currently hidden by active search or priority filters.
 */
function syncTasksOrderFromDOM() {
    const reorderedVisibleTasks = [];
    const visibleTaskIds = new Set();
    const domColumns = document.querySelectorAll('.kanban-column');

    domColumns.forEach(column => {
        const list = column.querySelector('.task-list');
        const columnStatus = list.dataset.status;
        const cards = list.querySelectorAll('.task-card');

        cards.forEach(card => {
            const taskId = card.dataset.id;
            const task = tasks.find(t => t.id === taskId);
            if (task) {
                task.status = columnStatus;
                reorderedVisibleTasks.push(task);
                visibleTaskIds.add(taskId);
            }
        });
    });

    // Retain any tasks that were filtered out of the DOM so they are not lost
    const hiddenTasks = tasks.filter(task => !visibleTaskIds.has(task.id));
    tasks = [...reorderedVisibleTasks, ...hiddenTasks];
}

/**
 * Sets up drop zone event listeners on all column containers (.task-list) 
 * and their parent columns for visual feedback, live positioning, and state updating.
 * 
 * - dragenter/dragleave: Manages visual column highlighting when dragging cards over them.
 * - dragover: Prevents default browser behavior and moves the '.dragging' card live
 *             relative to neighboring cards based on cursor position.
 * - drop: Finalizes the card placement, syncs the new order and status into the tasks array,
 *         saves to localStorage, clears highlights, and re-renders to rebind listeners cleanly.
 */
function setupDropZones() {
    const domColumns = document.querySelectorAll('.kanban-column');

    domColumns.forEach(column => {
        const list = column.querySelector('.task-list');

        // Highlight column on drag enter
        column.addEventListener('dragenter', (e) => {
            e.preventDefault();
            column.classList.add('drag-over');
        });

        // Remove highlight on drag leave
        column.addEventListener('dragleave', (e) => {
            // Ensure we only trigger when leaving the column container entirely
            if (!column.contains(e.relatedTarget)) {
                column.classList.remove('drag-over');
            }
        });

        // Allow dropping and preview insertion position live while dragging over the list
        list.addEventListener('dragover', (e) => {
            e.preventDefault();
            const draggingCard = document.querySelector('.task-card.dragging');
            if (!draggingCard) return;

            const afterElement = getDragAfterElement(list, e.clientY);
            if (afterElement == null) {
                list.appendChild(draggingCard);
            } else {
                list.insertBefore(draggingCard, afterElement);
            }
        });

        // Handle the drop action and persist both status and card order
        list.addEventListener('drop', (e) => {
            e.preventDefault();
            column.classList.remove('drag-over');

            const taskId = e.dataTransfer.getData('text/plain');
            const newStatus = list.dataset.status;
            const draggingCard = document.querySelector(`.task-card[data-id="${taskId}"]`);

            if (draggingCard) {
                const afterElement = getDragAfterElement(list, e.clientY);
                if (afterElement == null) {
                    list.appendChild(draggingCard);
                } else {
                    list.insertBefore(draggingCard, afterElement);
                }
            }

            // Update task status and array order to match the final DOM arrangement
            syncTasksOrderFromDOM();
            const droppedTask = tasks.find(t => t.id === taskId);
            if (droppedTask) {
                droppedTask.status = newStatus;
            }

            // Save updated state to localStorage and re-render board so empty/non-empty column controls stay accurate
            saveTasksToLocalStorage();
            renderBoard();
        });
    });
}

/**
 * Opens the modal pre-filled with an existing task's data (including priority) for editing.
 * 
 * @param {string} taskId - The unique ID of the task to edit.
 */
function openEditModal(taskId) {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    editingTaskId = taskId;

    // Ensure status options include the task's current column
    syncStatusSelectOptions(task.status);

    // Update modal title and form field values
    document.getElementById('modal-title').textContent = 'Edit Task';
    document.getElementById('task-title').value = task.title;
    document.getElementById('task-desc').value = task.description;
    document.getElementById('task-priority').value = task.priority || 'medium';
    document.getElementById('task-status').value = task.status;

    // Show the modal
    document.getElementById('task-modal').classList.add('active');
}

/**
 * Deletes a task from the state array by its ID, updates localStorage, and re-renders the board.
 * 
 * @param {string} taskId - The unique ID of the task to delete.
 */
function deleteTask(taskId) {
    tasks = tasks.filter(t => t.id !== taskId);
    saveTasksToLocalStorage();
    renderBoard();
}

/**
 * Sets up event listeners for opening, closing, and submitting the task modal (handles both create & edit).
 * 
 * - Modal Toggling: Opens/closes the modal overlay, resets editing state, and clears form inputs.
 * - Form Submission: Prevents page reload, validates input, updates/creates the task (including priority)
 *                   in state, persists changes to localStorage, and re-renders the board.
 */
function setupModal() {
    const modal = document.getElementById('task-modal');
    const openBtn = document.getElementById('open-modal-btn');
    const closeBtn = document.getElementById('close-modal-btn');
    const taskForm = document.getElementById('task-form');

    syncStatusSelectOptions();

    // Open modal for creating a new task when clicking "+ Add New Task"
    openBtn.addEventListener('click', () => {
        editingTaskId = null;
        document.getElementById('modal-title').textContent = 'Create New Task';
        taskForm.reset();
        syncStatusSelectOptions(columns[0] ? columns[0].id : 'todo');
        document.getElementById('task-priority').value = 'medium';
        modal.classList.add('active');
    });

    // Close modal when clicking "Cancel"
    closeBtn.addEventListener('click', () => {
        modal.classList.remove('active');
        taskForm.reset();
        editingTaskId = null;
    });

    // Close modal if clicking outside the modal content box on the dark overlay
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.remove('active');
            taskForm.reset();
            editingTaskId = null;
        }
    });

    // Handle form submission for both creating and updating tasks
    taskForm.addEventListener('submit', (e) => {
        e.preventDefault();

        // Capture input values from form fields
        const titleInput = document.getElementById('task-title').value.trim();
        const descInput = document.getElementById('task-desc').value.trim();
        const priorityInput = document.getElementById('task-priority').value;
        const statusInput = document.getElementById('task-status').value;

        // Ensure title is not empty before proceeding
        if (!titleInput) return;

        if (editingTaskId) {
            // Update existing task
            const task = tasks.find(t => t.id === editingTaskId);
            if (task) {
                task.title = titleInput;
                task.description = descInput;
                task.priority = priorityInput;
                task.status = statusInput;
            }
        } else {
            // Create a new task object with a unique ID using current timestamp
            const newTask = {
                id: Date.now().toString(),
                title: titleInput,
                description: descInput,
                priority: priorityInput,
                status: statusInput
            };
            tasks.push(newTask);
        }

        // Save to localStorage, re-render board, reset form inputs, clear editing state, and close modal
        saveTasksToLocalStorage();
        renderBoard();
        taskForm.reset();
        editingTaskId = null;
        modal.classList.remove('active');
    });
}

// Initialize the application, render columns and tasks, setup modal controls, enable filters, and enable column management
document.addEventListener('DOMContentLoaded', () => {
    renderBoard();
    setupModal();
    setupFilters();
    setupColumnManagement();
});