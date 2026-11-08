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
 * Sets up drop zone event listeners on all column containers (.task-list).
 * 
 * - dragover: Prevents the browser's default behavior to signal that this is a valid drop target.
 * - drop: Extracts the dragged task ID from dataTransfer, updates its status in the tasks array,
 *         and calls renderTasks() to redraw the board with the updated state.
 */
function setupDropZones() {
    const taskLists = document.querySelectorAll('.task-list');

    taskLists.forEach(list => {
        // Allow dropping by preventing default browser behavior
        list.addEventListener('dragover', (e) => {
            e.preventDefault();
        });

        // Handle the drop action
        list.addEventListener('drop', (e) => {
            e.preventDefault();

            // Retrieve the stored task ID from the dataTransfer object
            const taskId = e.dataTransfer.getData('text/plain');
            
            // Get the target column's status from its data attribute
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

// Initialize the application, render tasks, and activate drop zones once the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    renderTasks();
    setupDropZones();
});