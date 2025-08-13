// script.js

// DOM Elements
const authSection = document.getElementById('auth-section');
const todoSection = document.getElementById('todo-section');
const loginForm = document.getElementById('login-form');
const signupForm = document.getElementById('signup-form');
const loginTab = document.getElementById('login-tab');
const signupTab = document.getElementById('signup-tab');
const todoForm = document.getElementById('todo-form');
const todoList = document.getElementById('todo-list');
const userDisplay = document.getElementById('user-display');
const logoutBtn = document.getElementById('logout-btn');
const clearCompletedBtn = document.getElementById('clear-completed');
const allFilter = document.getElementById('all-filter');
const activeFilter = document.getElementById('active-filter');
const completedFilter = document.getElementById('completed-filter');
const overdueFilter = document.getElementById('overdue-filter');
const searchInput = document.getElementById('search-input');
const searchBtn = document.getElementById('search-btn');
const categoryFilter = document.getElementById('category-filter');
const sortBySelect = document.getElementById('sort-by');
const sortOrderSelect = document.getElementById('sort-order');
const themeToggle = document.getElementById('theme-toggle');
const editModal = document.getElementById('edit-modal');
const editTodoForm = document.getElementById('edit-todo-form');
const closeModalBtn = document.querySelector('.close-modal');
const cancelEditBtn = document.getElementById('cancel-edit');

// Profile Elements
const profileBtn = document.getElementById('profile-btn');
const profileModal = document.getElementById('profile-modal');
const closeProfileModal = document.getElementById('close-profile-modal');
const profileInitials = document.getElementById('profile-initials');
const profileInitialsLarge = document.getElementById('profile-initials-large');
const profileUsername = document.getElementById('profile-username');
const profileEmail = document.getElementById('profile-email');
const memberSince = document.getElementById('member-since');
const profileTotalTasks = document.getElementById('profile-total-tasks');
const profileCompletedTasks = document.getElementById('profile-completed-tasks');
const preferredTheme = document.getElementById('preferred-theme');
const savePreferencesBtn = document.getElementById('save-preferences');

// Stats elements
const totalCount = document.getElementById('total-count');
const activeCount = document.getElementById('active-count');
const completedCount = document.getElementById('completed-count');
const overdueCount = document.getElementById('overdue-count');
const completionPercent = document.getElementById('completion-percent');
const progressFill = document.getElementById('progress-fill');

// State
let currentUser = null;
let todos = [];
let currentFilter = 'all';
let currentSearch = '';
let currentCategory = '';
let currentSortBy = 'createdAt';
let currentSortOrder = 'desc';
let userPreferences = {
  theme: 'dark',
  sortBy: 'createdAt',
  sortOrder: 'desc'
};

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
  // Ensure modal is hidden on page load
  if (editModal) {
    editModal.classList.add('hidden');
  }
  if (profileModal) {
    profileModal.classList.add('hidden');
  }
  
  // Check if user is already logged in
  checkAuthStatus();
  
  // Set up event listeners
  setupEventListeners();
  
  // Load user preferences
  loadUserPreferences();
  
  // Enhance select elements
  enhanceSelectElements();
});

// Check authentication status
async function checkAuthStatus() {
  try {
    const response = await fetch('/auth/me');
    if (response.ok) {
      currentUser = await response.json();
      // Add creation date if not present
      if (!currentUser.createdAt) {
        currentUser.createdAt = new Date().toISOString();
      }
      showTodoSection();
      loadTodos();
      loadCategories();
      loadStats();
    } else {
      showAuthSection();
    }
  } catch (error) {
    console.error('Auth check failed:', error);
    showAuthSection();
  }
}

// Set up event listeners
function setupEventListeners() {
  // Auth form switching
  loginTab.addEventListener('click', () => switchAuthForm('login'));
  signupTab.addEventListener('click', () => switchAuthForm('signup'));
  
  // Auth form submissions
  loginForm.addEventListener('submit', handleLogin);
  signupForm.addEventListener('submit', handleSignup);
  
  // Logout
  logoutBtn.addEventListener('click', handleLogout);
  
  // Todo form submission
  todoForm.addEventListener('submit', handleCreateTodo);
  
  // Recurring task checkbox
  const todoRecurring = document.getElementById('todo-recurring');
  const recurrencePatternGroup = document.getElementById('recurrence-pattern-group');
  
  todoRecurring.addEventListener('change', function() {
    recurrencePatternGroup.style.display = this.checked ? 'block' : 'none';
  });
  
  // Clear completed
  clearCompletedBtn.addEventListener('click', handleClearCompleted);
  
  // Filter buttons
  allFilter.addEventListener('click', () => setFilter('all'));
  activeFilter.addEventListener('click', () => setFilter('active'));
  overdueFilter.addEventListener('click', () => setFilter('overdue'));
  
  // Search
  searchBtn.addEventListener('click', handleSearch);
  searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleSearch();
  });
  
  // Live search (debounced)
  let searchTimeout;
  searchInput.addEventListener('input', () => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(handleSearch, 300);
  });
  
  // Category filter
  categoryFilter.addEventListener('change', handleCategoryFilter);
  
  // Sorting
  sortBySelect.addEventListener('change', handleSortChange);
  sortOrderSelect.addEventListener('change', handleSortChange);
  
  // Theme toggle
  themeToggle.addEventListener('click', toggleTheme);
  
  // Edit modal
  editTodoForm.addEventListener('submit', handleUpdateTodo);
  closeModalBtn.addEventListener('click', closeEditModal);
  cancelEditBtn.addEventListener('click', closeEditModal);
  
  // Edit modal recurring task checkbox
  const editTodoRecurring = document.getElementById('edit-todo-recurring');
  const editRecurrencePatternGroup = document.getElementById('edit-recurrence-pattern-group');
  
  editTodoRecurring.addEventListener('change', function() {
    editRecurrencePatternGroup.style.display = this.checked ? 'block' : 'none';
  });
  
  // Profile modal
  profileBtn.addEventListener('click', openProfileModal);
  closeProfileModal.addEventListener('click', closeProfileModalFunc);
  savePreferencesBtn.addEventListener('click', savePreferences);
  
  // Close modals when clicking outside
  window.addEventListener('click', (e) => {
    if (e.target === editModal) {
      closeEditModal();
    }
    if (e.target === profileModal) {
      closeProfileModalFunc();
    }
  });
}

// Switch between login and signup forms
function switchAuthForm(form) {
  if (form === 'login') {
    loginForm.classList.remove('hidden');
    signupForm.classList.add('hidden');
    loginTab.classList.add('active');
    signupTab.classList.remove('active');
  } else {
    signupForm.classList.remove('hidden');
    loginForm.classList.add('hidden');
    signupTab.classList.add('active');
    loginTab.classList.remove('active');
  }
}

// Handle login
async function handleLogin(e) {
  e.preventDefault();
  
  const username = document.getElementById('login-username').value;
  const password = document.getElementById('login-password').value;
  
  try {
    showLoading(loginForm.querySelector('button'));
    
    const response = await fetch('/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ username, password })
    });
    
    hideLoading(loginForm.querySelector('button'));
    
    if (response.ok) {
      currentUser = await response.json();
      // Add creation date if not present
      if (!currentUser.createdAt) {
        currentUser.createdAt = new Date().toISOString();
      }
      showTodoSection();
      loadTodos();
      loadCategories();
      loadStats();
      showNotification('Welcome back! Login successful.', 'success');
    } else {
      const data = await response.json();
      showNotification(data.error || 'Login failed. Please try again.', 'error');
    }
  } catch (error) {
    hideLoading(loginForm.querySelector('button'));
    console.error('Login error:', error);
    showNotification('Network error. Please try again.', 'error');
  }
}

// Handle signup
async function handleSignup(e) {
  e.preventDefault();
  
  const username = document.getElementById('signup-username').value;
  const email = document.getElementById('signup-email').value;
  const password = document.getElementById('signup-password').value;
  
  try {
    showLoading(signupForm.querySelector('button'));
    
    const response = await fetch('/auth/signup', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ username, email, password })
    });
    
    hideLoading(signupForm.querySelector('button'));
    
    if (response.ok) {
      currentUser = await response.json();
      // Add creation date
      currentUser.createdAt = new Date().toISOString();
      showTodoSection();
      loadTodos();
      loadCategories();
      loadStats();
      showNotification('Account created successfully! Welcome!', 'success');
    } else {
      const data = await response.json();
      showNotification(data.error || 'Signup failed. Please try again.', 'error');
    }
  } catch (error) {
    hideLoading(signupForm.querySelector('button'));
    console.error('Signup error:', error);
    showNotification('Network error. Please try again.', 'error');
  }
}

// Handle logout
async function handleLogout() {
  try {
    const response = await fetch('/auth/logout', {
      method: 'POST'
    });
    
    if (response.ok) {
      currentUser = null;
      todos = [];
      showAuthSection();
      showNotification('You have been logged out.', 'success');
    } else {
      showNotification('Logout failed. Please try again.', 'error');
    }
  } catch (error) {
    console.error('Logout error:', error);
    showNotification('Network error. Please try again.', 'error');
  }
}

// Show auth section
function showAuthSection() {
  authSection.classList.remove('hidden');
  todoSection.classList.add('hidden');
  if (editModal) {
    editModal.classList.add('hidden');
  }
  document.getElementById('login-username').value = '';
  document.getElementById('login-password').value = '';
  document.getElementById('signup-username').value = '';
  document.getElementById('signup-email').value = '';
  document.getElementById('signup-password').value = '';
}

// Show todo section
function showTodoSection() {
  authSection.classList.add('hidden');
  todoSection.classList.remove('hidden');
  if (editModal) {
    editModal.classList.add('hidden');
  }
  if (profileModal) {
    profileModal.classList.add('hidden');
  }
  
  // Set personalized greeting
  const userName = currentUser.username || currentUser.user?.username || 'User';
  userDisplay.textContent = userName;
  
  // Set profile initials
  const initials = getInitials(userName);
  profileInitials.textContent = initials;
  profileInitialsLarge.textContent = initials;
  
  // Set greeting based on time of day
  const hour = new Date().getHours();
  let greeting = "Good day";
  if (hour < 12) {
    greeting = "Good morning";
  } else if (hour < 18) {
    greeting = "Good afternoon";
  } else {
    greeting = "Good evening";
  }
  document.getElementById('greeting-text').textContent = `${greeting},`;
  
  // Reset form
  document.getElementById('todo-title').value = '';
  document.getElementById('todo-description').value = '';
  document.getElementById('todo-due-date').value = '';
  document.getElementById('todo-priority').value = 'medium';
  document.getElementById('todo-category').value = 'General';
  document.getElementById('todo-recurring').checked = false;
  document.getElementById('recurrence-pattern-group').style.display = 'none';
  document.getElementById('todo-recurrence-pattern').value = 'daily';
}

// Load todos with filters and sorting
async function loadTodos() {
  try {
    const params = new URLSearchParams({
      filter: currentFilter,
      search: currentSearch,
      category: currentCategory,
      sortBy: currentSortBy,
      sortOrder: currentSortOrder
    });
    
    const response = await fetch(`/todos?${params}`);
    if (response.ok) {
      todos = await response.json();
      renderTodos();
    } else {
      showNotification('Failed to load tasks. Please refresh.', 'error');
    }
  } catch (error) {
    console.error('Load todos error:', error);
    showNotification('Network error. Please check connection.', 'error');
  }
}

// Handle create todo
async function handleCreateTodo(e) {
  e.preventDefault();
  
  const title = document.getElementById('todo-title').value.trim();
  const description = document.getElementById('todo-description').value.trim();
  const dueDate = document.getElementById('todo-due-date').value;
  const priority = document.getElementById('todo-priority').value;
  const category = document.getElementById('todo-category').value;
  const recurring = document.getElementById('todo-recurring').checked;
  const recurrencePattern = recurring ? document.getElementById('todo-recurrence-pattern').value : '';
  
  if (!title) return;
  
  try {
    showLoading(todoForm.querySelector('button'));
    
    const response = await fetch('/todos', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        title, 
        description, 
        dueDate: dueDate || null, 
        priority, 
        category,
        recurring,
        recurrencePattern: recurring ? recurrencePattern : ''
      })
    });
    
    hideLoading(todoForm.querySelector('button'));
    
    if (response.ok) {
      const newTodo = await response.json();
      todos.push(newTodo);
      renderTodos();
      todoForm.reset();
      document.getElementById('todo-priority').value = 'medium';
      document.getElementById('todo-category').value = 'General';
      document.getElementById('todo-recurring').checked = false;
      document.getElementById('recurrence-pattern-group').style.display = 'none';
      document.getElementById('todo-recurrence-pattern').value = 'daily';
      
      // Update custom dropdowns
      const prioritySelected = document.getElementById('todo-priority-selected');
      const categorySelected = document.getElementById('todo-category-selected');
      if (prioritySelected) prioritySelected.querySelector('span').textContent = 'Medium';
      if (categorySelected) categorySelected.querySelector('span').textContent = 'General';
      
      showNotification('Task added successfully!', 'success');
      loadStats();
      loadCategories();
    } else {
      const data = await response.json();
      showNotification(data.error || 'Failed to add task.', 'error');
    }
  } catch (error) {
    hideLoading(todoForm.querySelector('button'));
    console.error('Create todo error:', error);
    showNotification('Network error. Please try again.', 'error');
  }
}

// Handle update todo
async function handleUpdateTodo(e) {
  e.preventDefault();
  
  const id = document.getElementById('edit-todo-id').value;
  const title = document.getElementById('edit-todo-title').value.trim();
  const description = document.getElementById('edit-todo-description').value.trim();
  const dueDate = document.getElementById('edit-todo-due-date').value;
  const priority = document.getElementById('edit-todo-priority').value;
  const category = document.getElementById('edit-todo-category').value;
  const recurring = document.getElementById('edit-todo-recurring').checked;
  const recurrencePattern = recurring ? document.getElementById('edit-todo-recurrence-pattern').value : '';
  
  if (!title) return;
  
  try {
    const response = await fetch(`/todos/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        title, 
        description, 
        dueDate: dueDate || null, 
        priority, 
        category,
        recurring,
        recurrencePattern: recurring ? recurrencePattern : ''
      })
    });
    
    if (response.ok) {
      const updatedTodo = await response.json();
      const index = todos.findIndex(todo => todo.id === parseInt(id));
      if (index !== -1) {
        todos[index] = updatedTodo;
        renderTodos();
        closeEditModal();
        showNotification('Task updated successfully!', 'success');
        loadStats();
        loadCategories();
      }
    } else {
      const data = await response.json();
      showNotification(data.error || 'Failed to update task.', 'error');
    }
  } catch (error) {
    console.error('Update todo error:', error);
    showNotification('Network error. Please try again.', 'error');
  }
}

// Handle delete todo
async function handleDeleteTodo(id) {
  try {
    const response = await fetch(`/todos/${id}`, {
      method: 'DELETE'
    });
    
    if (response.ok) {
      todos = todos.filter(todo => todo.id !== id);
      renderTodos();
      showNotification('Task deleted successfully!', 'success');
      loadStats();
      loadCategories();
    } else {
      const data = await response.json();
      showNotification(data.error || 'Failed to delete task.', 'error');
    }
  } catch (error) {
    console.error('Delete todo error:', error);
    showNotification('Network error. Please try again.', 'error');
  }
}

// Handle clear completed
async function handleClearCompleted() {
  try {
    const completedTodos = todos.filter(todo => todo.completed);
    
    if (completedTodos.length === 0) {
      showNotification('No completed tasks to clear.', 'info');
      return;
    }
    
    // Delete all completed todos
    for (const todo of completedTodos) {
      await handleDeleteTodo(todo.id);
    }
    
    showNotification(`Cleared ${completedTodos.length} completed tasks!`, 'success');
  } catch (error) {
    console.error('Clear completed error:', error);
    showNotification('Failed to clear completed tasks.', 'error');
  }
}

// Render todos based on current filter
function renderTodos() {
  // Ensure modal is hidden
  if (editModal) {
    editModal.classList.add('hidden');
  }
  
  // Render todos
  todoList.innerHTML = '';
  
  if (todos.length === 0) {
    const emptyMessage = document.createElement('li');
    emptyMessage.className = 'empty-message';
    
    if (currentFilter === 'all' && !currentSearch && !currentCategory) {
      emptyMessage.textContent = 'No tasks yet. Add a new task to get started!';
    } else if (currentFilter === 'active') {
      emptyMessage.textContent = 'No active tasks. Great job!';
    } else if (currentFilter === 'completed') {
      emptyMessage.textContent = 'No completed tasks yet.';
    } else if (currentFilter === 'overdue') {
      emptyMessage.textContent = 'No overdue tasks. Great job staying on track!';
    } else {
      emptyMessage.textContent = 'No tasks match your current filters.';
    }
    
    todoList.appendChild(emptyMessage);
  } else {
    todos.forEach(todo => {
      const todoItem = createTodoElement(todo);
      todoList.appendChild(todoItem);
    });
  }
}

// Create todo element
function createTodoElement(todo) {
  const li = document.createElement('li');
  li.className = `todo-item priority-${todo.priority}`;
  li.dataset.id = todo.id;
  
  // Check if task is overdue
  const isOverdue = todo.dueDate && !todo.completed && new Date(todo.dueDate) < new Date();
  
  li.innerHTML = `
    <input type="checkbox" class="todo-checkbox" ${todo.completed ? 'checked' : ''}>
    <div class="todo-content">
      <div class="todo-title ${todo.completed ? 'completed' : ''}">${escapeHtml(todo.title)}</div>
      <div class="todo-meta">
        <span class="todo-category">${escapeHtml(todo.category)}</span>
        <span class="todo-priority ${todo.priority}">${todo.priority.charAt(0).toUpperCase() + todo.priority.slice(1)}</span>
        ${todo.dueDate ? `<span class="todo-due-date ${isOverdue ? 'overdue' : ''}">${formatDate(todo.dueDate)}</span>` : ''}
      </div>
      ${todo.description ? `<div class="todo-description">${escapeHtml(todo.description)}</div>` : ''}
      <div class="todo-date">Created: ${formatDateTime(todo.createdAt)}</div>
    </div>
    <div class="todo-actions">
      <button class="todo-edit" title="Edit">✏️</button>
      <button class="todo-delete" title="Delete">🗑️</button>
    </div>
  `;
  
  // Add event listeners
  const checkbox = li.querySelector('.todo-checkbox');
  const editBtn = li.querySelector('.todo-edit');
  const deleteBtn = li.querySelector('.todo-delete');
  
  checkbox.addEventListener('change', () => {
    updateTodo(todo.id, { completed: checkbox.checked });
  });
  
  editBtn.addEventListener('click', () => {
    openEditModal(todo);
  });
  
  deleteBtn.addEventListener('click', () => {
    showConfirmDialog('Delete Task', 'Are you sure you want to delete this task?', () => {
      handleDeleteTodo(todo.id);
    });
  });
  
  return li;
}

// Open edit modal with todo data
function openEditModal(todo) {
  // Validate todo object
  if (!todo || !todo.id) {
    console.error('Invalid todo object passed to openEditModal');
    return;
  }
  
  try {
    document.getElementById('edit-todo-id').value = todo.id;
    document.getElementById('edit-todo-title').value = todo.title;
    document.getElementById('edit-todo-description').value = todo.description || '';
    document.getElementById('edit-todo-due-date').value = todo.dueDate || '';
    document.getElementById('edit-todo-priority').value = todo.priority;
    document.getElementById('edit-todo-category').value = todo.category || 'General';
    document.getElementById('edit-todo-recurring').checked = todo.recurring || false;
    
    // Handle recurrence pattern
    const editRecurrencePatternGroup = document.getElementById('edit-recurrence-pattern-group');
    if (todo.recurring) {
      editRecurrencePatternGroup.style.display = 'block';
      document.getElementById('edit-todo-recurrence-pattern').value = todo.recurrencePattern || 'daily';
    } else {
      editRecurrencePatternGroup.style.display = 'none';
      document.getElementById('edit-todo-recurrence-pattern').value = 'daily';
    }
    
    // Update custom dropdowns in edit modal
    setTimeout(() => {
      const editPrioritySelected = document.getElementById('edit-todo-priority-selected');
      const editCategorySelected = document.getElementById('edit-todo-category-selected');
      if (editPrioritySelected) editPrioritySelected.querySelector('span').textContent = todo.priority.charAt(0).toUpperCase() + todo.priority.slice(1);
      if (editCategorySelected) editCategorySelected.querySelector('span').textContent = todo.category || 'General';
      
      // Update hidden selects
      const editPrioritySelect = document.getElementById('edit-todo-priority');
      const editCategorySelect = document.getElementById('edit-todo-category');
      if (editPrioritySelect) editPrioritySelect.value = todo.priority;
      if (editCategorySelect) editCategorySelect.value = todo.category || 'General';
    }, 100);
    
    if (editModal) {
      editModal.classList.remove('hidden');
    }
  } catch (error) {
    console.error('Error opening edit modal:', error);
    showNotification('Error opening edit modal. Please try again.', 'error');
  }
}

// Close edit modal
function closeEditModal() {
  if (editModal) {
    editModal.classList.add('hidden');
  }
  if (editTodoForm) {
    editTodoForm.reset();
  }
}

// Update todo (simplified version for checkbox)
async function updateTodo(id, updates) {
  try {
    const response = await fetch(`/todos/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updates)
    });
    
    if (response.ok) {
      const updatedTodo = await response.json();
      const index = todos.findIndex(todo => todo.id === id);
      if (index !== -1) {
        todos[index] = updatedTodo;
        renderTodos();
        if (updates.completed !== undefined) {
          const message = updates.completed ? 'Task marked as completed!' : 'Task marked as active!';
          showNotification(message, 'success');
        }
        loadStats();
      }
    } else {
      const data = await response.json();
      showNotification(data.error || 'Failed to update task.', 'error');
    }
  } catch (error) {
    console.error('Update todo error:', error);
    showNotification('Network error. Please try again.', 'error');
  }
}

// Set filter
function setFilter(filter) {
  currentFilter = filter;
  
  // Update active filter button
  allFilter.classList.toggle('active', filter === 'all');
  activeFilter.classList.toggle('active', filter === 'active');
  completedFilter.classList.toggle('active', filter === 'completed');
  overdueFilter.classList.toggle('active', filter === 'overdue');
  
  loadTodos();
}

// Handle search
function handleSearch() {
  currentSearch = searchInput.value.trim();
  loadTodos();
}

// Handle category filter
function handleCategoryFilter() {
  currentCategory = categoryFilter.value;
  loadTodos();
}

// Update category filter options
function updateCategoryFilterOptions(categories) {
  const categoryFilterSelect = document.getElementById('category-filter');
  const categoryFilterOptions = document.getElementById('category-filter-options');
  const categoryFilterSelected = document.getElementById('category-filter-selected');
  
  if (!categoryFilterSelect || !categoryFilterOptions) return;
  
  // Clear existing options except the first one
  while (categoryFilterOptions.children.length > 1) {
    categoryFilterOptions.removeChild(categoryFilterOptions.lastChild);
  }
  
  // Add new options
  categories.forEach(category => {
    const option = document.createElement('div');
    option.className = 'dropdown-option';
    option.dataset.value = category;
    option.innerHTML = `<span>${category}</span>`;
    categoryFilterOptions.appendChild(option);
  });
  
  // Reinitialize the dropdown
  initCustomDropdown('category-filter');
}

// Handle sort change
function handleSortChange() {
  currentSortBy = sortBySelect.value;
  currentSortOrder = sortOrderSelect.value;
  updateSortByDisplay();
  updateSortOrderDisplay();
  loadTodos();
  saveUserPreferences();
}

// Update sort by display text
function updateSortByDisplay() {
  const sortBySelect = document.getElementById('sort-by');
  const sortBySelected = document.getElementById('sort-by-selected');
  
  if (!sortBySelect || !sortBySelected) return;
  
  const selectedText = Array.from(sortBySelect.options).find(option => option.value === sortBySelect.value)?.text || 'Date Created';
  sortBySelected.querySelector('span').textContent = selectedText;
}

// Update sort order display text
function updateSortOrderDisplay() {
  const sortOrderSelect = document.getElementById('sort-order');
  const sortOrderSelected = document.getElementById('sort-order-selected');
  
  if (!sortOrderSelect || !sortOrderSelected) return;
  
  const selectedText = Array.from(sortOrderSelect.options).find(option => option.value === sortOrderSelect.value)?.text || 'Newest First';
  sortOrderSelected.querySelector('span').textContent = selectedText;
}

// Load categories for filter dropdown
async function loadCategories() {
  try {
    const response = await fetch('/todos/categories');
    if (response.ok) {
      const categories = await response.json();
      
      // Update category filter with custom dropdown
      updateCategoryFilterOptions(categories);
      
      // Set the current category if it exists
      if (currentCategory) {
        const categoryFilterSelect = document.getElementById('category-filter');
        if (categoryFilterSelect) {
          categoryFilterSelect.value = currentCategory;
        }
      }
    }
  } catch (error) {
    console.error('Load categories error:', error);
  }
}

// Load statistics
async function loadStats() {
  try {
    const response = await fetch('/todos/stats');
    if (response.ok) {
      const stats = await response.json();
      
      totalCount.textContent = stats.total;
      activeCount.textContent = stats.active;
      completedCount.textContent = stats.completed;
      overdueCount.textContent = stats.overdue;
      
      // Update progress bar
      const total = stats.total;
      const completed = stats.completed;
      const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
      
      completionPercent.textContent = `${percent}%`;
      progressFill.style.width = `${percent}%`;
    }
  } catch (error) {
    console.error('Load stats error:', error);
  }
}

// Load user preferences
async function loadUserPreferences() {
  try {
    const response = await fetch('/user/preferences');
    if (response.ok) {
      userPreferences = await response.json();
      
      // Apply theme
      document.documentElement.setAttribute('data-theme', userPreferences.theme);
      updateThemeIcon();
      
      // Apply sorting preferences
      currentSortBy = userPreferences.sortBy;
      currentSortOrder = userPreferences.sortOrder;
      sortBySelect.value = currentSortBy;
      sortOrderSelect.value = currentSortOrder;
      
      // Update display text for custom dropdowns
      updateSortByDisplay();
      updateSortOrderDisplay();
    }
  } catch (error) {
    console.error('Load preferences error:', error);
  }
}

// Save user preferences
async function saveUserPreferences() {
  try {
    await fetch('/user/preferences', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        theme: userPreferences.theme,
        sortBy: currentSortBy,
        sortOrder: currentSortOrder
      })
    });
  } catch (error) {
    console.error('Save preferences error:', error);
  }
}

// Toggle theme
function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute('data-theme');
  userPreferences.theme = currentTheme === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', userPreferences.theme);
  updateThemeIcon();
  saveUserPreferences();
}

// Update theme icon based on current theme
function updateThemeIcon() {
  themeToggle.textContent = userPreferences.theme === 'dark' ? '☀️' : '🌙';
}

// Format date
function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric'
  });
}

// Format date and time
function formatDateTime(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Show loading indicator
function showLoading(button) {
  const originalText = button.innerHTML;
  button.innerHTML = '<span class="spinner"></span> Processing...';
  button.disabled = true;
  button.dataset.originalText = originalText;
}

// Hide loading indicator
function hideLoading(button) {
  if (button.dataset.originalText) {
    button.innerHTML = button.dataset.originalText;
    button.disabled = false;
    delete button.dataset.originalText;
  }
}

// Get user initials (first letter of username only)
function getInitials(name) {
  if (!name) return 'U';
  return name.substring(0, 1).toUpperCase();
}

// Open profile modal
function openProfileModal() {
  if (!currentUser) return;
  
  // Set profile information
  profileUsername.textContent = currentUser.username || currentUser.user?.username || 'Unknown';
  
  // Handle email (could be in different locations depending on how it was fetched)
  let email = 'No email provided';
  if (currentUser.email) {
    email = currentUser.email;
  } else if (currentUser.user && currentUser.user.email) {
    email = currentUser.user.email;
  }
  profileEmail.textContent = email;
  
  // Set member since (if available)
  if (currentUser.createdAt) {
    const createdDate = new Date(currentUser.createdAt);
    memberSince.textContent = createdDate.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  } else {
    memberSince.textContent = 'Unknown';
  }
  
  // Set theme preference
  const currentTheme = document.documentElement.getAttribute('data-theme');
  preferredTheme.textContent = currentTheme === 'dark' ? 'Dark' : 'Light';
  
  // Load task statistics
  loadProfileStats();
  
  // Show modal
  if (profileModal) {
    profileModal.classList.remove('hidden');
  }
}

// Close profile modal
function closeProfileModalFunc() {
  if (profileModal) {
    profileModal.classList.add('hidden');
  }
}

// Load profile statistics
async function loadProfileStats() {
  try {
    const response = await fetch('/todos/stats');
    if (response.ok) {
      const stats = await response.json();
      profileTotalTasks.textContent = stats.total;
      profileCompletedTasks.textContent = stats.completed;
    }
  } catch (error) {
    console.error('Load profile stats error:', error);
  }
}

// Save preferences
async function savePreferences() {
  try {
    showLoading(savePreferencesBtn);
    
    const response = await fetch('/user/preferences', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        theme: userPreferences.theme,
        sortBy: currentSortBy,
        sortOrder: currentSortOrder
      })
    });
    
    hideLoading(savePreferencesBtn);
    
    if (response.ok) {
      showNotification('Preferences saved successfully!', 'success');
      closeProfileModalFunc();
    } else {
      showNotification('Failed to save preferences.', 'error');
    }
  } catch (error) {
    hideLoading(savePreferencesBtn);
    console.error('Save preferences error:', error);
    showNotification('Network error. Please try again.', 'error');
  }
}

// Show notification
function showNotification(message, type) {
  // Remove existing notifications
  const existingNotification = document.querySelector('.notification');
  if (existingNotification) {
    existingNotification.remove();
  }
  
  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  
  let icon = 'ℹ️';
  if (type === 'success') icon = '✅';
  if (type === 'error') icon = '❌';
  if (type === 'info') icon = 'ℹ️';
  
  notification.innerHTML = `
    <div class="notification-content">
      <span class="notification-icon">${icon}</span>
      <span class="notification-message">${message}</span>
    </div>
  `;
  
  document.body.appendChild(notification);
  
  // Show notification
  setTimeout(() => {
    notification.classList.add('show');
  }, 100);
  
  // Hide notification after 3 seconds
  setTimeout(() => {
    notification.classList.remove('show');
    setTimeout(() => {
      notification.remove();
    }, 300);
  }, 3000);
}

// Enhance select elements with custom dropdowns
function enhanceSelectElements() {
  // Initialize custom dropdowns
  initCustomDropdown('todo-category');
  initCustomDropdown('todo-priority');
  initCustomDropdown('todo-recurrence-pattern');
  initCustomDropdown('category-filter');
  initCustomDropdown('sort-by');
  initCustomDropdown('sort-order');
  
  // Also initialize for edit modal when it's opened
  const editModal = document.getElementById('edit-modal');
  if (editModal) {
    const observer = new MutationObserver(function(mutations) {
      mutations.forEach(function(mutation) {
        if (mutation.type === 'childList') {
          if (document.getElementById('edit-todo-category')) {
            initCustomDropdown('edit-todo-category');
          }
          if (document.getElementById('edit-todo-priority')) {
            initCustomDropdown('edit-todo-priority');
          }
          if (document.getElementById('edit-todo-recurrence-pattern')) {
            initCustomDropdown('edit-todo-recurrence-pattern');
          }
        }
      });
    });
    
    observer.observe(editModal, { childList: true, subtree: true });
  }
}

// Initialize custom dropdown
function initCustomDropdown(selectId) {
  const select = document.getElementById(selectId);
  if (!select) return;
  
  const selectedDiv = document.getElementById(`${selectId}-selected`);
  const optionsDiv = document.getElementById(`${selectId}-options`);
  const options = optionsDiv ? optionsDiv.querySelectorAll('.dropdown-option') : [];
  
  if (!selectedDiv || !optionsDiv) return;
  
  // Set initial value
  const selectedOption = select.options[select.selectedIndex];
  if (selectedOption) {
    selectedDiv.querySelector('span').textContent = selectedOption.text;
  }
  
  // Toggle dropdown
  selectedDiv.addEventListener('click', (e) => {
    e.stopPropagation();
    closeAllDropdowns();
    optionsDiv.classList.toggle('show');
    selectedDiv.classList.toggle('active');
  });
  
  // Handle option selection
  options.forEach(option => {
    option.addEventListener('click', (e) => {
      e.stopPropagation();
      
      // Update UI
      selectedDiv.querySelector('span').textContent = option.textContent.trim();
      selectedDiv.classList.remove('active');
      optionsDiv.classList.remove('show');
      
      // Update hidden select
      const value = option.dataset.value;
      select.value = value;
      
      // Add selected class to current option
      options.forEach(opt => opt.classList.remove('selected'));
      option.classList.add('selected');
      
      // Trigger change event
      const event = new Event('change', { bubbles: true });
      select.dispatchEvent(event);
    });
  });
}

// Close all dropdowns
function closeAllDropdowns() {
  document.querySelectorAll('.dropdown-options').forEach(dropdown => {
    dropdown.classList.remove('show');
  });
  document.querySelectorAll('.dropdown-selected').forEach(selected => {
    selected.classList.remove('active');
  });
}

// Close dropdowns when clicking outside
document.addEventListener('click', (e) => {
  if (!e.target.closest('.custom-dropdown')) {
    closeAllDropdowns();
  }
});

// Show confirm dialog
function showConfirmDialog(title, message, onConfirm) {
  if (confirm(`${title}\n\n${message}`)) {
    onConfirm();
  }
}