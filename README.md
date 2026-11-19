# KanbaNotes
A single-page Kanban board application built with **HTML5**, **CSS3**, and **JavaScript**

## Features

- **Dynamic Board & Column Management:** Dynamically renders columns (`To Do`, `In Progress`, `Done` by default), lets you add custom columns from the header, and lets you delete empty columns (keeping the task modal's status dropdown synchronized).
- **Task CRUD via Modal:** Create new tasks or edit existing ones (title, description, priority, and status column) using a shared modal dialog, or delete tasks directly from any card.
- **Native HTML5 Drag-and-Drop & Intra-Column Reordering:** Drag cards across columns to change status and position them above or below neighboring cards using `getBoundingClientRect()` vertical offset calculations, with visual feedback via `dragenter`, `dragleave`, `dragover`, and `drop`.
- **Priority Badges:** Assign `low`, `medium`, or `high` priority levels to tasks with color-coded badges on each card.
- **Real-Time Search & Priority Filtering:** Filter visible cards live by matching text in the title or description and/or selecting a priority level (`All Priorities`, `High`, `Medium`, `Low`) without mutating saved state.
- **Browser `localStorage` Persistence:** Automatically saves and loads columns (`kanban_columns`) and tasks (`kanban_tasks`) across page reloads, with safe JSON parsing and fallback defaults.

## Project Structure
```text
kanban-board/
├── index.html   # Page layout, header controls, board container, and task modal markup
├── style.css    # Grid/flexbox styling, card/badge styles, drag states, and modal overlay
└── app.js       # State management, DOM rendering, drag-and-drop, filters, and localStorage 
```
## How to Run

1. Place index.html, style.css, and app.js in the same project folder.

2. Open index.html directly in any modern web browser (such as Chrome, Firefox, Edge, or Safari) or serve the folder using a local static server.
