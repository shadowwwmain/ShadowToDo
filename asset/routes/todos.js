const express = require('express');
const router = express.Router();

module.exports = (requireAuth, readTodos, writeTodos, readUsers) => {
  // Get all todos for current user with filtering and sorting
  router.get('/', requireAuth, async (req, res) => {
    try {
      const { 
        filter = 'all', 
        sortBy = 'createdAt', 
        sortOrder = 'desc',
        search = '',
        category = ''
      } = req.query;
      
      let todos = await readTodos();
      
      // Filter by user
      todos = todos.filter(todo => todo.userId === req.session.userId);
      
      // Handle recurring tasks - create instances for daily recurring tasks that are overdue
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const updatedTodos = [];
      const newRecurringTodos = [];
      
      todos.forEach(todo => {
        // If it's a daily recurring task and completed, create a new instance for today if needed
        if (todo.recurring && todo.recurrencePattern === 'daily' && todo.completed) {
          const dueDate = todo.dueDate ? new Date(todo.dueDate) : null;
          
          // If the task has a due date and it's in the past, create a new instance
          if (dueDate && dueDate < today) {
            // Calculate how many days have passed since the due date
            const daysPassed = Math.floor((today - dueDate) / (1000 * 60 * 60 * 24));
            
            // Create a new instance for today
            if (daysPassed > 0) {
              const newTodo = {
                ...todo,
                id: Math.max(...todos.map(t => t.id)) + 1 + newRecurringTodos.length,
                completed: false,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                dueDate: today.toISOString()
              };
              
              // Remove recurrencePattern to prevent infinite recursion
              delete newTodo.recurrencePattern;
              
              newRecurringTodos.push(newTodo);
            }
          }
        }
        
        updatedTodos.push(todo);
      });
      
      // Add new recurring task instances
      todos = [...updatedTodos, ...newRecurringTodos];
      
      // Apply search filter
      if (search) {
        const searchTerm = search.toLowerCase();
        todos = todos.filter(todo => 
          todo.title.toLowerCase().includes(searchTerm) || 
          (todo.description && todo.description.toLowerCase().includes(searchTerm)) ||
          (todo.category && todo.category.toLowerCase().includes(searchTerm))
        );
      }
      
      // Apply category filter
      if (category) {
        todos = todos.filter(todo => todo.category === category);
      }
      
      // Apply completion filter
      if (filter === 'active') {
        todos = todos.filter(todo => !todo.completed);
      } else if (filter === 'completed') {
        todos = todos.filter(todo => todo.completed);
      }
      
      // Apply sorting
      todos.sort((a, b) => {
        let aValue = a[sortBy];
        let bValue = b[sortBy];
        
        // Handle date sorting
        if (sortBy === 'dueDate' || sortBy === 'createdAt') {
          aValue = aValue ? new Date(aValue) : new Date(0);
          bValue = bValue ? new Date(bValue) : new Date(0);
        }
        
        // Handle priority sorting
        if (sortBy === 'priority') {
          const priorityOrder = { high: 3, medium: 2, low: 1 };
          aValue = priorityOrder[aValue] || 0;
          bValue = priorityOrder[bValue] || 0;
        }
        
        // Apply sort order
        if (sortOrder === 'asc') {
          return aValue > bValue ? 1 : -1;
        } else {
          return aValue < bValue ? 1 : -1;
        }
      });
      
      res.json(todos);
    } catch (error) {
      console.error('Get todos error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
  
  // Create a new todo
  router.post('/', requireAuth, async (req, res) => {
    try {
      const { 
        title, 
        description, 
        dueDate, 
        priority = 'medium', 
        category = 'General',
        recurring = false,
        recurrencePattern = ''
      } = req.body;
      
      // Validate input
      if (!title) {
        return res.status(400).json({ error: 'Title is required' });
      }
      
      // Read existing todos
      const todos = await readTodos();
      
      // Create new todo
      const newTodo = {
        id: todos.length > 0 ? Math.max(...todos.map(t => t.id)) + 1 : 1,
        title,
        description: description || '',
        completed: false,
        priority,
        category,
        dueDate: dueDate || null,
        recurring,
        recurrencePattern: recurrencePattern || '',
        userId: req.session.userId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      // Save todo
      todos.push(newTodo);
      await writeTodos(todos);
      
      res.status(201).json(newTodo);
    } catch (error) {
      console.error('Create todo error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
  
  // Update a todo
  router.put('/:id', requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const { 
        title, 
        description, 
        completed, 
        dueDate, 
        priority, 
        category,
        recurring,
        recurrencePattern
      } = req.body;
      
      // Read todos
      const todos = await readTodos();
      
      // Find todo
      const todoIndex = todos.findIndex(todo => 
        todo.id === parseInt(id) && todo.userId === req.session.userId
      );
      
      if (todoIndex === -1) {
        return res.status(404).json({ error: 'Todo not found' });
      }
      
      // Handle recurring task completion
      const isRecurringTask = todos[todoIndex].recurring && todos[todoIndex].recurrencePattern === 'daily';
      const isBeingCompleted = completed !== undefined && completed === true && !todos[todoIndex].completed;
      
      // If it's a recurring task being completed, create a new instance for the next day
      if (isRecurringTask && isBeingCompleted) {
        const originalDueDate = todos[todoIndex].dueDate ? new Date(todos[todoIndex].dueDate) : new Date();
        const nextDay = new Date(originalDueDate);
        nextDay.setDate(nextDay.getDate() + 1);
        
        // Create a new instance of the recurring task
        const newRecurringTodo = {
          ...todos[todoIndex],
          id: Math.max(...todos.map(t => t.id)) + 1,
          completed: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          dueDate: nextDay.toISOString()
        };
        
        // Add the new recurring task to the list
        todos.push(newRecurringTodo);
      }
      
      // Update todo
      if (title !== undefined) todos[todoIndex].title = title;
      if (description !== undefined) todos[todoIndex].description = description;
      if (completed !== undefined) todos[todoIndex].completed = completed;
      if (dueDate !== undefined) todos[todoIndex].dueDate = dueDate;
      if (priority !== undefined) todos[todoIndex].priority = priority;
      if (category !== undefined) todos[todoIndex].category = category;
      if (recurring !== undefined) todos[todoIndex].recurring = recurring;
      if (recurrencePattern !== undefined) todos[todoIndex].recurrencePattern = recurrencePattern;
      
      todos[todoIndex].updatedAt = new Date().toISOString();
      
      // Save todos
      await writeTodos(todos);
      
      res.json(todos[todoIndex]);
    } catch (error) {
      console.error('Update todo error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
  
  // Delete a todo
  router.delete('/:id', requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      
      // Read todos
      const todos = await readTodos();
      
      // Find todo
      const todoIndex = todos.findIndex(todo => 
        todo.id === parseInt(id) && todo.userId === req.session.userId
      );
      
      if (todoIndex === -1) {
        return res.status(404).json({ error: 'Todo not found' });
      }
      
      // Remove todo
      todos.splice(todoIndex, 1);
      
      // Save todos
      await writeTodos(todos);
      
      res.json({ message: 'Todo deleted successfully' });
    } catch (error) {
      console.error('Delete todo error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
  
  // Get todo statistics
  router.get('/stats', requireAuth, async (req, res) => {
    try {
      const todos = await readTodos();
      const userTodos = todos.filter(todo => todo.userId === req.session.userId);
      
      const stats = {
        total: userTodos.length,
        completed: userTodos.filter(todo => todo.completed).length,
        active: userTodos.filter(todo => !todo.completed).length,
        overdue: userTodos.filter(todo => 
          !todo.completed && todo.dueDate && new Date(todo.dueDate) < new Date()
        ).length,
        byPriority: {
          high: userTodos.filter(todo => todo.priority === 'high' && !todo.completed).length,
          medium: userTodos.filter(todo => todo.priority === 'medium' && !todo.completed).length,
          low: userTodos.filter(todo => todo.priority === 'low' && !todo.completed).length
        },
        byCategory: {}
      };
      
      // Calculate by category
      userTodos.forEach(todo => {
        if (!todo.completed) {
          const category = todo.category || 'Uncategorized';
          stats.byCategory[category] = (stats.byCategory[category] || 0) + 1;
        }
      });
      
      res.json(stats);
    } catch (error) {
      console.error('Get stats error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
  
  // Get unique categories
  router.get('/categories', requireAuth, async (req, res) => {
    try {
      const todos = await readTodos();
      const userTodos = todos.filter(todo => todo.userId === req.session.userId);
      
      const categories = [...new Set(userTodos.map(todo => todo.category || 'General'))];
      
      res.json(categories);
    } catch (error) {
      console.error('Get categories error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
  
  return router;
};