/**
 * Initial state data structure representing our Kanban tasks.
 * Serves as the single source of truth for the application.
 */
const tasks = [
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

/**
 * Renders all tasks from the tasks array into their respective columns.
 * 
 * 1. Clears all existing task lists to prevent duplicate DOM nodes.
 * 2. Iterates over the tasks array to build task card elements dynamically.
 * 3. Sets the draggable attribute and attaches dragstart/dragend event listeners.
 * 4. Appends each card to its matching column container based on its status.
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
        `;

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
 *         clears highlights, and calls renderTasks() to sync the UI state.
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

                // Re-render the board to reflect the state change in the UI
                renderTasks();
            }
        });
    });
}

/**
 * Sets up event listeners for opening, closing, and submitting the task creation modal.
 * 
 * - Modal Toggling: Opens/closes the modal overlay and resets form input fields.
 * - Form Submission: Prevents page reload, captures input values, generates a unique task ID,
 *                   pushes the new task object into the tasks array, re-renders the board, 
 *                   and closes the modal.
 */
function setupModal() {
    const modal = document.getElementById('task-modal');
    const openBtn = document.getElementById('open-modal-btn');
    const closeBtn = document.getElementById('close-modal-btn');
    const taskForm = document.getElementById('task-form');

    // Open modal when clicking "+ Add New Task"
    openBtn.addEventListener('click', () => {
        modal.classList.add('active');
    });

    // Close modal when clicking "Cancel"
    closeBtn.addEventListener('click', () => {
        modal.classList.remove('active');
        taskForm.reset();
    });

    // Close modal if clicking outside the modal content box on the dark overlay
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.remove('active');
            taskForm.reset();
        }
    });

    // Handle form submission to create a new task
    taskForm.addEventListener('submit', (e) => {
        e.preventDefault();

        // Capture input values from form fields
        const titleInput = document.getElementById('task-title').value.trim();
        const descInput = document.getElementById('task-desc').value.trim();
        const statusInput = document.getElementById('task-status').value;

        // Ensure title is not empty before proceeding
        if (!titleInput) return;

        // Create a new task object with a unique ID using current timestamp
        const newTask = {
            id: Date.now().toString(),
            title: titleInput,
            description: descInput,
            status: statusInput
        };

        // Push new task into our single source of truth array
        tasks.push(newTask);

        // Re-render board to display the newly created task card
        renderTasks();

        // Reset form inputs and close modal overlay
        taskForm.reset();
        modal.classList.remove('active');
    });
}

// Initialize the application, render tasks, activate drop zones, and setup modal controls once the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    renderTasks();
    setupDropZones();
    setupModal();
});