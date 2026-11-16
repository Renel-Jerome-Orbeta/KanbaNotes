/**
 * Loads tasks from browser LocalStorage, or falls back to default initial tasks
 * if no stored data exists. Serves as the single source of truth for the application.
 */
let tasks = loadTasksFromLocalStorage();

// Tracks the ID of the task currently being edited (null if creating a new task)
let editingTaskId = null;

/**
 * Retrieves tasks stored in localStorage under the 'kanban_tasks' key.
 * 
 * @returns {Array} An array of task objects.
 */
function loadTasksFromLocalStorage() {
    const storedTasks = localStorage.getItem('kanban_tasks');
    if (storedTasks) {
        try {
            return JSON.parse(storedTasks);
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
            status: 'todo'
        },
        {
            id: '2',
            title: 'Setup Repository',
            description: 'Initialize git and basic file structure.',
            status: 'inprogress'
        },
        {
            id: '3',
            title: 'Project Planning',
            description: 'Define requirements and timeline.',
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
 * Renders all tasks from the tasks array into their respective columns.
 * 
 * 1. Clears all existing task lists to prevent duplicate DOM nodes.
 * 2. Iterates over the tasks array to build task card elements dynamically.
 * 3. Appends Edit and Delete action buttons with event listeners to each card.
 * 4. Sets the draggable attribute and attaches dragstart/dragend event listeners.
 * 5. Appends each card to its matching column container based on its status.
 */
function renderTasks() {
    // 1. Clear all task lists first to prevent duplicates
    const taskLists = document.querySelectorAll('.task-list');
    taskLists.forEach(list => {
        list.innerHTML = '';
    });

    // 2. Loop through the tasks array and build elements
    tasks.forEach(task => {
        const card = document.createElement('div');
        card.className = 'task-card';
        card.draggable = true; // Makes the element natively draggable
        card.dataset.id = task.id; // Store task ID on the DOM element

        card.innerHTML = `
            <h3>${task.title}</h3>
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

        // 3. Find the correct column container using the status and append the card
        const container = document.querySelector(`.task-list[data-status="${task.status}"]`);
        if (container) {
            container.appendChild(card);
        }
    });
}

/**
 * Sets up drop zone event listeners on all column containers (.task-list) 
 * and their parent columns for visual feedback and state updating.
 * 
 * - dragenter/dragleave: Manages visual column highlighting when dragging cards over them.
 * - dragover: Prevents default browser behavior to signal a valid drop target.
 * - drop: Extracts dragged task ID, updates its status in the tasks array,
 *         saves to localStorage, clears highlights, and calls renderTasks() to sync the UI state.
 */
function setupDropZones() {
    const columns = document.querySelectorAll('.kanban-column');

    columns.forEach(column => {
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

        // Allow dropping by preventing default browser behavior
        list.addEventListener('dragover', (e) => {
            e.preventDefault();
        });

        // Handle the drop action
        list.addEventListener('drop', (e) => {
            e.preventDefault();
            column.classList.remove('drag-over');

            // Retrieve the stored task ID from the dataTransfer object
            const taskId = e.dataTransfer.getData('text/plain');
            
            // Get the target column's status from its inner list data attribute
            const newStatus = list.dataset.status;

            // Find the task in our state array and update its status property
            const task = tasks.find(t => t.id === taskId);
            if (task) {
                task.status = newStatus;

                // Save updated state to localStorage and re-render board
                saveTasksToLocalStorage();
                renderTasks();
            }
        });
    });
}

/**
 * Opens the modal pre-filled with an existing task's data for editing.
 * 
 * @param {string} taskId - The unique ID of the task to edit.
 */
function openEditModal(taskId) {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    editingTaskId = taskId;

    // Update modal title and form field values
    document.getElementById('modal-title').textContent = 'Edit Task';
    document.getElementById('task-title').value = task.title;
    document.getElementById('task-desc').value = task.description;
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
    renderTasks();
}

/**
 * Sets up event listeners for opening, closing, and submitting the task modal (handles both create & edit).
 * 
 * - Modal Toggling: Opens/closes the modal overlay, resets editing state, and clears form inputs.
 * - Form Submission: Prevents page reload, validates input, updates/creates the task in state,
 *                   persists changes to localStorage, and re-renders the board.
 */
function setupModal() {
    const modal = document.getElementById('task-modal');
    const openBtn = document.getElementById('open-modal-btn');
    const closeBtn = document.getElementById('close-modal-btn');
    const taskForm = document.getElementById('task-form');

    // Open modal for creating a new task when clicking "+ Add New Task"
    openBtn.addEventListener('click', () => {
        editingTaskId = null;
        document.getElementById('modal-title').textContent = 'Create New Task';
        taskForm.reset();
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
        const statusInput = document.getElementById('task-status').value;

        // Ensure title is not empty before proceeding
        if (!titleInput) return;

        if (editingTaskId) {
            // Update existing task
            const task = tasks.find(t => t.id === editingTaskId);
            if (task) {
                task.title = titleInput;
                task.description = descInput;
                task.status = statusInput;
            }
        } else {
            // Create a new task object with a unique ID using current timestamp
            const newTask = {
                id: Date.now().toString(),
                title: titleInput,
                description: descInput,
                status: statusInput
            };
            tasks.push(newTask);
        }

        // Save to localStorage, re-render board, reset form inputs, clear editing state, and close modal
        saveTasksToLocalStorage();
        renderTasks();
        taskForm.reset();
        editingTaskId = null;
        modal.classList.remove('active');
    });
}

// Initialize the application, render tasks, activate drop zones, and setup modal controls once the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    renderTasks();
    setupDropZones();
    setupModal();
});