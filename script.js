let todoItemsContainer = document.getElementById("todoItemsContainer");
let addTodoButton = document.getElementById("addTodoButton");
let saveTodoButton = document.getElementById("saveTodoButton");
let todoUserInput = document.getElementById("todoUserInput");
let todoDeadline = document.getElementById("todoDeadline");
let filterButtons = document.querySelectorAll(".filter-button");

// Request notification permission and handle it properly
function requestNotificationPermission() {
    if ("Notification" in window) {
        if (Notification.permission !== "granted" && Notification.permission !== "denied") {
            Notification.requestPermission().then(function(permission) {
                if (permission === "granted") {
                    showNotification("Notifications enabled! You'll be reminded of your tasks.");
                    updateNotificationStatus();
                } else {
                    showNotification("Please enable notifications to get task reminders.");
                }
            });
        }
    } else {
        showNotification("Your browser doesn't support notifications.");
    }
}

// Call this when the app starts
requestNotificationPermission();

// Add enter key support
todoUserInput.addEventListener("keypress", function(event) {
    if (event.key === "Enter") {
        onAddTodo();
    }
});

// Filter button click handlers
filterButtons.forEach(button => {
    button.addEventListener("click", () => {
        filterButtons.forEach(btn => btn.classList.remove("active"));
        button.classList.add("active");
        filterTodos(button.dataset.filter);
    });
});

function getTodoListFromLocalStorage() {
    let stringifiedTodoList = localStorage.getItem("todoList");
    let parsedTodoList = JSON.parse(stringifiedTodoList);
    if (parsedTodoList === null) {
        return [];
    } else {
        return parsedTodoList;
    }
}

let todoList = getTodoListFromLocalStorage();
let todosCount = todoList.length;

// Auto-save functionality
function autoSave() {
    localStorage.setItem("todoList", JSON.stringify(todoList));
}

function showNotification(message) {
    const notification = document.createElement("div");
    notification.className = "notification";
    notification.textContent = message;
    document.body.appendChild(notification);

    // Trigger animation
    setTimeout(() => {
        notification.classList.add("show");
    }, 10);

    // Remove notification after 3 seconds
    setTimeout(() => {
        notification.classList.remove("show");
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 3000);
}

function showChromeNotification(title, options) {
    if ("Notification" in window && Notification.permission === "granted") {
        try {
            // Add default options
            const defaultOptions = {
                icon: "/favicon-32x32.png", // Use absolute path for deployed site
                badge: "/favicon-32x32.png", // Use absolute path for deployed site
                requireInteraction: true, // Notification will stay until user interacts
                vibrate: [200, 100, 200], // Vibration pattern for mobile devices
                tag: "todo-notification", // Group similar notifications
                renotify: true, // Allow multiple notifications
                silent: false // Play notification sound
            };

            // Merge default options with provided options
            const notificationOptions = { ...defaultOptions, ...options };

            // Create and show notification
            const notification = new Notification(title, notificationOptions);

            // Handle notification click
            notification.onclick = function() {
                window.focus(); // Focus the window
                notification.close(); // Close the notification
            };

            // Auto close after 10 seconds if not interacted with
            setTimeout(() => {
                notification.close();
            }, 10000);

            return notification;
        } catch (error) {
            console.error("Error showing notification:", error);
            showNotification("Could not show notification. Please check your browser settings.");
        }
    } else if (Notification.permission !== "granted") {
        showNotification("Please enable notifications to get task reminders.");
        requestNotificationPermission();
    }
}

function onAddTodo() {
    let userInputValue = todoUserInput.value.trim();
    let deadlineValue = todoDeadline.value;

    if (userInputValue === "") {
        showNotification("Please enter a task!");
        return;
    }

    todosCount = todosCount + 1;

    let newTodo = {
        text: userInputValue,
        uniqueNo: todosCount,
        isChecked: false,
        createdAt: new Date().toISOString(),
        deadline: deadlineValue
    };
    
    todoList.push(newTodo);
    createAndAppendTodo(newTodo);
    todoUserInput.value = "";
    todoDeadline.value = "";
    autoSave();
    showNotification("Task added successfully!");

    // Schedule notification if deadline is set
    if (deadlineValue) {
        scheduleNotification(newTodo);
    }
}

function scheduleNotification(todo) {
    if (!("Notification" in window) || Notification.permission !== "granted") {
        return;
    }

    const deadline = new Date(todo.deadline);
    const now = new Date();
    const timeUntilDeadline = deadline - now;
    const oneHourInMs = 60 * 60 * 1000; // 1 hour in milliseconds

    // Only schedule notifications for uncompleted tasks
    if (!todo.isChecked) {
        // Schedule 1-hour reminder if deadline is more than 1 hour away
        if (timeUntilDeadline > oneHourInMs) {
            const reminderTime = timeUntilDeadline - oneHourInMs;
            setTimeout(() => {
                // Check if task is still uncompleted before sending notification
                const currentTodo = todoList.find(t => t.uniqueNo === todo.uniqueNo);
                if (currentTodo && !currentTodo.isChecked) {
                    showChromeNotification("Task Reminder", {
                        body: `"${todo.text}" is due in 1 hour!`,
                        icon: "/favicon-32x32.png"
                    });
                }
            }, reminderTime);
        }

        // Schedule deadline notification
        if (timeUntilDeadline > 0) {
            setTimeout(() => {
                // Check if task is still uncompleted before sending notification
                const currentTodo = todoList.find(t => t.uniqueNo === todo.uniqueNo);
                if (currentTodo && !currentTodo.isChecked) {
                    showChromeNotification("Task Deadline", {
                        body: `"${todo.text}" is due now!`,
                        icon: "/favicon-32x32.png"
                    });
                }
            }, timeUntilDeadline);
        }
    }
}

addTodoButton.onclick = function() {
    onAddTodo();
};

function onTodoStatusChange(checkboxId, labelId, todoId) {
    let checkboxElement = document.getElementById(checkboxId);
    let labelElement = document.getElementById(labelId);

    labelElement.classList.toggle("checked");

    let todoIndex = todoList.findIndex(function(eachItem) {
        let eachItemID = "todo" + eachItem.uniqueNo;
        return eachItemID === todoId;
    });

    if (todoIndex !== -1) {
        todoList[todoIndex].isChecked = checkboxElement.checked;
        
        // Update deadline display when task is completed/uncompleted
        const deadlineDisplay = labelElement.querySelector(".deadline-display");
        if (deadlineDisplay && todoList[todoIndex].deadline) {
            const deadline = new Date(todoList[todoIndex].deadline);
            const now = new Date();
            
            if (checkboxElement.checked) {
                // Task is completed
                deadlineDisplay.className = "deadline-display completed";
                deadlineDisplay.textContent = `Completed: ${deadline.toLocaleString()}`;
            } else {
                // Task is uncompleted
                if (deadline < now) {
                    deadlineDisplay.className = "deadline-display overdue";
                    deadlineDisplay.textContent = `Overdue: ${deadline.toLocaleString()}`;
                } else {
                    deadlineDisplay.className = "deadline-display upcoming";
                    deadlineDisplay.textContent = `Due: ${deadline.toLocaleString()}`;
                }
            }
        }
        
        autoSave();
        
        // Show notification when task is completed
        if (checkboxElement.checked) {
            showNotification("Task completed! 🎉");
        }
    }
}

function onDeleteTodo(todoId) {
    let todoElement = document.getElementById(todoId);
    
    // Add fade-out animation
    todoElement.style.opacity = "0";
    todoElement.style.transform = "translateX(20px)";
    
    setTimeout(() => {
        todoItemsContainer.removeChild(todoElement);
        
        let deleteElementIndex = todoList.findIndex(function(eachTodo) {
            let eachTodoId = "todo" + eachTodo.uniqueNo;
            return eachTodoId === todoId;
        });

        todoList.splice(deleteElementIndex, 1);
        autoSave();
        showNotification("Task deleted successfully!");
    }, 300);
}

function createAndAppendTodo(todo) {
    let todoId = "todo" + todo.uniqueNo;
    let checkboxId = "checkbox" + todo.uniqueNo;
    let labelId = "label" + todo.uniqueNo;

    let todoElement = document.createElement("li");
    todoElement.classList.add("todo-item-container", "d-flex", "flex-row");
    todoElement.id = todoId;
    todoItemsContainer.appendChild(todoElement);

    let inputElement = document.createElement("input");
    inputElement.type = "checkbox";
    inputElement.id = checkboxId;
    inputElement.checked = todo.isChecked;

    inputElement.onclick = function() {
        onTodoStatusChange(checkboxId, labelId, todoId);
    };

    inputElement.classList.add("checkbox-input");
    todoElement.appendChild(inputElement);

    let labelContainer = document.createElement("div");
    labelContainer.classList.add("label-container", "d-flex", "flex-row");
    todoElement.appendChild(labelContainer);

    let labelElement = document.createElement("label");
    labelElement.setAttribute("for", checkboxId);
    labelElement.id = labelId;
    labelElement.classList.add("checkbox-label");
    labelElement.textContent = todo.text;

    if (todo.isChecked === true) {
        labelElement.classList.add("checked");
    }

    // Add deadline display if exists
    if (todo.deadline) {
        const deadlineDisplay = document.createElement("div");
        deadlineDisplay.className = "deadline-display";
        const deadline = new Date(todo.deadline);
        const now = new Date();
        
        if (todo.isChecked) {
            deadlineDisplay.classList.add("completed");
            deadlineDisplay.textContent = `Completed: ${deadline.toLocaleString()}`;
        } else if (deadline < now) {
            deadlineDisplay.classList.add("overdue");
            deadlineDisplay.textContent = `Overdue: ${deadline.toLocaleString()}`;
        } else {
            deadlineDisplay.classList.add("upcoming");
            deadlineDisplay.textContent = `Due: ${deadline.toLocaleString()}`;
        }
        
        labelElement.appendChild(deadlineDisplay);
    }

    labelContainer.appendChild(labelElement);

    let iconContainer = document.createElement("div");
    iconContainer.classList.add("icon-container");
    labelContainer.appendChild(iconContainer);

    // Add edit icon
    let editIcon = document.createElement("i");
    editIcon.classList.add("fas", "fa-edit", "edit-icon");
    editIcon.onclick = function() {
        onEditTodo(todoId);
    };
    iconContainer.appendChild(editIcon);

    // Add delete icon
    let deleteIcon = document.createElement("i");
    deleteIcon.classList.add("fas", "fa-trash", "delete-icon");
    deleteIcon.onclick = function() {
        onDeleteTodo(todoId);
    };
    iconContainer.appendChild(deleteIcon);
}

function onEditTodo(todoId) {
    const todoIndex = todoList.findIndex(todo => "todo" + todo.uniqueNo === todoId);
    if (todoIndex === -1) return;

    const todo = todoList[todoIndex];
    const todoElement = document.getElementById(todoId);
    const labelElement = todoElement.querySelector(".checkbox-label");
    const iconContainer = todoElement.querySelector(".icon-container");

    // Create edit form
    const editForm = document.createElement("div");
    editForm.className = "edit-form";
    editForm.innerHTML = `
        <input type="text" class="edit-input" value="${todo.text}">
        <input type="datetime-local" class="edit-deadline" value="${todo.deadline || ''}">
        <div class="edit-buttons">
            <button class="save-edit">Save</button>
            <button class="cancel-edit">Cancel</button>
        </div>
    `;

    // Hide the label and icons
    labelElement.style.display = "none";
    iconContainer.style.display = "none";

    // Add the form
    todoElement.querySelector(".label-container").appendChild(editForm);

    // Focus the input
    const editInput = editForm.querySelector(".edit-input");
    editInput.focus();

    // Handle save
    editForm.querySelector(".save-edit").onclick = function() {
        const newText = editInput.value.trim();
        const newDeadline = editForm.querySelector(".edit-deadline").value;

        if (newText === "") {
            showNotification("Task cannot be empty!");
            return;
        }

        // Update todo
        todo.text = newText;
        todo.deadline = newDeadline;

        // Update UI
        labelElement.textContent = newText;
        labelElement.style.display = "block";
        iconContainer.style.display = "flex";

        // Update deadline display
        const existingDeadlineDisplay = labelElement.querySelector(".deadline-display");
        if (existingDeadlineDisplay) {
            existingDeadlineDisplay.remove();
        }

        if (newDeadline) {
            const deadlineDisplay = document.createElement("div");
            deadlineDisplay.className = "deadline-display";
            const deadline = new Date(newDeadline);
            const now = new Date();
            
            if (deadline < now && !todo.isChecked) {
                deadlineDisplay.classList.add("overdue");
                deadlineDisplay.textContent = `Overdue: ${deadline.toLocaleString()}`;
            } else if (deadline > now) {
                deadlineDisplay.classList.add("upcoming");
                deadlineDisplay.textContent = `Due: ${deadline.toLocaleString()}`;
            } else if (todo.isChecked) {
                deadlineDisplay.classList.add("completed");
                deadlineDisplay.textContent = `Completed: ${deadline.toLocaleString()}`;
            }
            
            labelElement.appendChild(deadlineDisplay);
        }

        // Remove form
        editForm.remove();

        // Save changes
        autoSave();
        showNotification("Task updated successfully!");

        // Reschedule notifications if deadline changed
        if (newDeadline) {
            scheduleNotification(todo);
        }
    };

    // Handle cancel
    editForm.querySelector(".cancel-edit").onclick = function() {
        labelElement.style.display = "block";
        iconContainer.style.display = "flex";
        editForm.remove();
    };

    // Handle enter key
    editInput.addEventListener("keypress", function(event) {
        if (event.key === "Enter") {
            editForm.querySelector(".save-edit").click();
        }
    });
}

function filterTodos(filter) {
    const todoElements = document.querySelectorAll(".todo-item-container");
    const now = new Date();
    let hasVisibleTodos = false;

    todoElements.forEach(element => {
        const todoId = element.id;
        const todo = todoList.find(t => "todo" + t.uniqueNo === todoId);
        
        if (!todo) return;

        let show = true;
        switch (filter) {
            case "upcoming":
                // Show only uncompleted tasks with future deadlines
                show = !todo.isChecked && todo.deadline && new Date(todo.deadline) > now;
                break;
            case "overdue":
                // Show only uncompleted tasks with past deadlines
                show = !todo.isChecked && todo.deadline && new Date(todo.deadline) < now;
                break;
            case "completed":
                // Show only completed tasks
                show = todo.isChecked;
                break;
            case "all":
            default:
                // Show all tasks
                show = true;
                break;
        }

        // Apply the display style with animation
        if (show) {
            element.style.display = "flex";
            element.style.opacity = "1";
            element.style.transform = "translateY(0)";
            hasVisibleTodos = true;
        } else {
            element.style.opacity = "0";
            element.style.transform = "translateY(-10px)";
            setTimeout(() => {
                element.style.display = "none";
            }, 300);
        }
    });

    // Show/hide empty state message based on filter
    const existingEmptyState = document.querySelector(".empty-state");
    if (!hasVisibleTodos) {
        if (!existingEmptyState) {
            const emptyState = document.createElement("div");
            emptyState.className = "empty-state";
            let message = "No tasks yet! Add a task to get started.";
            
            switch (filter) {
                case "upcoming":
                    message = "No upcoming tasks! Add a task with a future deadline.";
                    break;
                case "overdue":
                    message = "No overdue tasks! All tasks are up to date.";
                    break;
                case "completed":
                    message = "No completed tasks! Complete a task to see it here.";
                    break;
            }
            
            emptyState.textContent = message;
            todoItemsContainer.appendChild(emptyState);
        } else {
            let message = "No tasks match the current filter!";
            switch (filter) {
                case "upcoming":
                    message = "No upcoming tasks! Add a task with a future deadline.";
                    break;
                case "overdue":
                    message = "No overdue tasks! All tasks are up to date.";
                    break;
                case "completed":
                    message = "No completed tasks! Complete a task to see it here.";
                    break;
            }
            existingEmptyState.textContent = message;
        }
    } else if (existingEmptyState) {
        existingEmptyState.remove();
    }
}

// Update the updateEmptyState function to work with filters
function updateEmptyState() {
    const activeFilter = document.querySelector(".filter-button.active").dataset.filter;
    filterTodos(activeFilter);
}

// Initialize todos and set up initial filter
for (let todo of todoList) {
    createAndAppendTodo(todo);
    if (todo.deadline) {
        scheduleNotification(todo);
    }
}

// Initial empty state check with default filter
filterTodos("all");

// Update empty state whenever todos change
const originalPush = Array.prototype.push;
Array.prototype.push = function() {
    const result = originalPush.apply(this, arguments);
    updateEmptyState();
    return result;
};

const originalSplice = Array.prototype.splice;
Array.prototype.splice = function() {
    const result = originalSplice.apply(this, arguments);
    updateEmptyState();
    return result;
};

// Update footer year
document.querySelector('.footer-year').textContent = new Date().getFullYear();

// Update notification status indicator
function updateNotificationStatus() {
    const existingStatus = document.querySelector(".notification-status");
    if (existingStatus) {
        existingStatus.remove();
    }

    const notificationStatus = document.createElement("div");
    notificationStatus.className = "notification-status";
    notificationStatus.innerHTML = `
        <i class="fas ${Notification.permission === "granted" ? "fa-bell" : "fa-bell-slash"}"></i>
        <span>${Notification.permission === "granted" ? "Notifications enabled" : "Notifications disabled"}</span>
    `;
    
    // Add click handler to request permission if not granted
    notificationStatus.onclick = function() {
        if (Notification.permission !== "granted") {
            requestNotificationPermission();
        }
    };

    // Add to the page
    const statusContainer = document.querySelector(".todos-heading");
    statusContainer.appendChild(notificationStatus);
}

// Call this when the app starts
document.addEventListener("DOMContentLoaded", function() {
    requestNotificationPermission();
    updateNotificationStatus();
});