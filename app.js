// Initial state data structure
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

// Function to render all tasks into their respective columns
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
        card.draggable = true;
        card.dataset.id = task.id; // Store task ID on the DOM element for later

        card.innerHTML = `
            <h3>${task.title}</h3>
            <p>${task.description}</p>
        `;

        // 3. Find the correct column container using the status
        const container = document.querySelector(`.task-list[data-status="${task.status}"]`);
        if (container) {
            container.appendChild(card);
        }
    });
}

// Run the render function when the page loads
document.addEventListener('DOMContentLoaded', () => {
    renderTasks();
});