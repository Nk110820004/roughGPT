<script>
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import RichTextEditor from '$lib/RichTextEditor.svelte';
	import BoardView from '$lib/BoardView.svelte';
	import AnimatedIcon from '$lib/AnimatedIcon.svelte';
	import anime from 'animejs/lib/anime.es.js';

	let userName = $state('');
	let todos = $state([]);
	let newTodo = $state('');
	let searchQuery = $state('');
	let selectedCategory = $state('all');
	let showCompleted = $state(true);
	let editingId = $state(null);
	let editText = $state('');
	let draggedItem = $state(null);
	let currentView = $state('list'); // 'list', 'board', 'calendar'
	let showRichEditor = $state(false);
	let newTodoRichText = $state('');

	const categories = [
		{ id: 'all', name: 'All Tasks', icon: '📋', color: 'var(--primary)' },
		{ id: 'personal', name: 'Personal', icon: '🏠', color: '#ff6b6b' },
		{ id: 'work', name: 'Work', icon: '💼', color: '#4ecdc4' },
		{ id: 'shopping', name: 'Shopping', icon: '🛒', color: '#45b7d1' },
		{ id: 'health', name: 'Health', icon: '🏃', color: '#96ceb4' },
		{ id: 'learning', name: 'Learning', icon: '📚', color: '#feca57' }
	];

	let selectedTodoCategory = $state('personal');
	let selectedTodoPriority = $state('medium');

	// Filtered todos based on search and category
	let filteredTodos = $derived(todos.filter(todo => {
		const matchesSearch = todo.text.toLowerCase().includes(searchQuery.toLowerCase());
		const matchesCategory = selectedCategory === 'all' || todo.category === selectedCategory;
		const matchesCompletion = showCompleted || !todo.completed;
		return matchesSearch && matchesCategory && matchesCompletion;
	}));

	function addTodo() {
		const todoText = showRichEditor ? newTodoRichText : newTodo;
		if (todoText && todoText.trim()) {
			const todo = {
				id: Date.now(),
				text: todoText.trim(),
				completed: false,
				category: selectedTodoCategory,
				createdAt: new Date(),
				priority: selectedTodoPriority,
				isRichText: showRichEditor
			};
			todos = [...todos, todo];
			if (showRichEditor) {
				newTodoRichText = '';
			} else {
				newTodo = '';
			}
			saveTodos();
		}
	}

	function toggleTodo(id) {
		todos = todos.map(todo => 
			todo.id === id ? { ...todo, completed: !todo.completed } : todo
		);
		saveTodos();
	}

	function deleteTodo(id) {
		todos = todos.filter(todo => todo.id !== id);
		saveTodos();
	}

	function updateTodo(updatedTodo) {
		todos = todos.map(todo =>
			todo.id === updatedTodo.id ? updatedTodo : todo
		);
		saveTodos();
	}

	function startEdit(todo) {
		editingId = todo.id;
		editText = todo.text;
	}

	function saveEdit() {
		if (editText.trim()) {
			todos = todos.map(todo => 
				todo.id === editingId ? { ...todo, text: editText.trim() } : todo
			);
		}
		editingId = null;
		editText = '';
		saveTodos();
	}

	function cancelEdit() {
		editingId = null;
		editText = '';
	}

	function saveTodos() {
		localStorage.setItem('todos', JSON.stringify(todos));
	}

	function loadTodos() {
		const saved = localStorage.getItem('todos');
		if (saved) {
			todos = JSON.parse(saved);
		}
	}

	function logout() {
		localStorage.removeItem('userName');
		localStorage.removeItem('todos');
		goto('/');
	}

	function disconnectAPI() {
		// Remove API-related data
		localStorage.removeItem('apiKey');
		localStorage.removeItem('pineconeConnected');

		// Show success animation
		anime({
			targets: '.disconnect-btn',
			scale: [1, 1.2, 1],
			duration: 300,
			easing: 'easeOutBounce'
		});

		// Redirect after animation
		setTimeout(() => {
			goto('/');
		}, 500);
	}

	// Drag and drop functions
	function handleDragStart(event, todo) {
		draggedItem = todo;
		event.dataTransfer.effectAllowed = 'move';
	}

	function handleDragOver(event) {
		event.preventDefault();
		event.dataTransfer.dropEffect = 'move';
	}

	function handleDrop(event, targetTodo) {
		event.preventDefault();
		if (draggedItem && draggedItem.id !== targetTodo.id) {
			const draggedIndex = todos.findIndex(t => t.id === draggedItem.id);
			const targetIndex = todos.findIndex(t => t.id === targetTodo.id);
			
			const newTodos = [...todos];
			newTodos.splice(draggedIndex, 1);
			newTodos.splice(targetIndex, 0, draggedItem);
			
			todos = newTodos;
			saveTodos();
		}
		draggedItem = null;
	}

	onMount(() => {
		const savedName = localStorage.getItem('userName');
		if (!savedName) {
			goto('/');
			return;
		}
		userName = savedName;
		loadTodos();
	});
</script>

<div class="workspace-container">
	<!-- Sidebar -->
	<aside class="sidebar">
		<div class="sidebar-header">
			<h2 class="app-title">TaskFlow</h2>
			<div class="user-info">
				<div class="user-avatar">
					{userName.charAt(0).toUpperCase()}
				</div>
				<span class="user-name">{userName}</span>
			</div>
		</div>

		<nav class="categories">
			<h3>Categories</h3>
			{#each categories as category}
				<button
					class="category-item"
					class:active={selectedCategory === category.id}
					onclick={() => selectedCategory = category.id}
					style="--category-color: {category.color}"
				>
					<span class="category-icon">{category.icon}</span>
					<span class="category-name">{category.name}</span>
					<span class="task-count">
						{todos.filter(t => category.id === 'all' || t.category === category.id).length}
					</span>
				</button>
			{/each}
		</nav>

		<div class="sidebar-footer">
			<button class="disconnect-btn" onclick={disconnectAPI}>
				<AnimatedIcon name="disconnect" size={20} rotation={true} />
				Disconnect API
			</button>
			<button class="logout-btn" onclick={logout}>
				<AnimatedIcon name="logout" size={20} bounce={true} />
				Sign Out
			</button>
		</div>
	</aside>

	<!-- Main Content -->
	<main class="main-content">
		<header class="content-header">
			<div class="header-left">
				<h1 class="page-title">
					{categories.find(c => c.id === selectedCategory)?.name || 'All Tasks'}
				</h1>
				<div class="task-stats">
					{filteredTodos.filter(t => !t.completed).length} active, 
					{filteredTodos.filter(t => t.completed).length} completed
				</div>
			</div>
			
			<div class="header-actions">
				<div class="search-container">
					<input
						type="text"
						placeholder="Search tasks..."
						bind:value={searchQuery}
						class="search-input"
					/>
					<span class="search-icon">🔍</span>
				</div>
				
				<div class="view-mode-selector">
					<button
						class="view-btn"
						class:active={currentView === 'list'}
						onclick={() => currentView = 'list'}
						title="List View"
					>
						<AnimatedIcon name="list" size={16} bounce={true} />
						<span>List</span>
					</button>
					<button
						class="view-btn"
						class:active={currentView === 'board'}
						onclick={() => currentView = 'board'}
						title="Board View"
					>
						<AnimatedIcon name="board" size={16} bounce={true} />
						<span>Board</span>
					</button>
				</div>

				<button
					class="toggle-completed"
					class:active={showCompleted}
					onclick={() => showCompleted = !showCompleted}
				>
					{showCompleted ? '👁️' : '👁️‍🗨️'} Show Completed
				</button>
			</div>
		</header>

		<!-- Add New Task -->
		<div class="add-task-container">
			<div class="add-task-form">
				<input
					type="text"
					placeholder="Add a new task..."
					bind:value={newTodo}
					class="new-task-input"
					onkeypress={(e) => e.key === 'Enter' && addTodo()}
				/>
				
				<select bind:value={selectedTodoCategory} class="category-select">
					{#each categories.slice(1) as category}
						<option value={category.id}>{category.icon} {category.name}</option>
					{/each}
				</select>
				
				<button onclick={addTodo} class="add-task-btn" disabled={!newTodo.trim()}>
					Add Task
				</button>
			</div>
		</div>

		<!-- Tasks Display -->
		<div class="tasks-container">
			{#if filteredTodos.length === 0}
				<div class="empty-state">
					<div class="empty-icon">📝</div>
					<h3>No tasks found</h3>
					<p>
						{searchQuery ? 'Try adjusting your search terms' : 'Create your first task to get started!'}
					</p>
				</div>
			{:else if currentView === 'board'}
				<BoardView
					todos={filteredTodos}
					categories={categories}
					onUpdateTodo={updateTodo}
					onDeleteTodo={deleteTodo}
				/>
			{:else}
				<div class="tasks-list">
					{#each filteredTodos as todo (todo.id)}
						<div
							class="task-item"
							class:completed={todo.completed}
							class:editing={editingId === todo.id}
							draggable="true"
							ondragstart={(e) => handleDragStart(e, todo)}
							ondragover={handleDragOver}
							ondrop={(e) => handleDrop(e, todo)}
							style="--category-color: {categories.find(c => c.id === todo.category)?.color}"
							role="listitem"
							aria-label="Task: {todo.text}"
						>
							<div class="task-checkbox-container">
								<button
									class="task-checkbox"
									onclick={() => toggleTodo(todo.id)}
									class:checked={todo.completed}
								>
									{#if todo.completed}✓{/if}
								</button>
							</div>

							<div class="task-content">
								{#if editingId === todo.id}
									<input
										type="text"
										bind:value={editText}
										class="edit-input"
										onkeypress={(e) => e.key === 'Enter' && saveEdit()}
										onkeydown={(e) => e.key === 'Escape' && cancelEdit()}
										onblur={saveEdit}
									/>
								{:else}
									<div
										class="task-text"
										onclick={() => startEdit(todo)}
										onkeydown={(e) => e.key === 'Enter' && startEdit(todo)}
										role="button"
										tabindex="0"
										aria-label="Edit task"
									>
										{#if todo.isRichText}
											{@html todo.text}
										{:else}
											{todo.text}
										{/if}
									</div>
								{/if}
								
								<div class="task-meta">
									<span class="task-category">
										{categories.find(c => c.id === todo.category)?.icon}
										{categories.find(c => c.id === todo.category)?.name}
									</span>
									<span class="task-date">
										{new Date(todo.createdAt).toLocaleDateString()}
									</span>
								</div>
							</div>

							<div class="task-actions">
								{#if editingId === todo.id}
									<button onclick={saveEdit} class="action-btn save">✓</button>
									<button onclick={cancelEdit} class="action-btn cancel">✕</button>
								{:else}
									<button onclick={() => startEdit(todo)} class="action-btn edit">✏️</button>
									<button onclick={() => deleteTodo(todo.id)} class="action-btn delete">🗑️</button>
								{/if}
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</div>
	</main>
</div>

<style>
	:root {
		--primary: #6366f1;
		--primary-light: #818cf8;
		--secondary: #ec4899;
		--secondary-light: #f472b6;
		--accent: #f59e0b;
		--accent-light: #fbbf24;
		--success: #10b981;
		--success-light: #34d399;
		--warning: #f59e0b;
		--danger: #ef4444;
		--surface: #ffffff;
		--background: linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%);
		--background-light: #f8fafc;
		--text: #1f2937;
		--text-muted: #6b7280;
		--border: #e5e7eb;
		--shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
		--shadow-lg: 0 20px 40px rgba(0, 0, 0, 0.15);
		--shadow-colored: 0 10px 25px rgba(99, 102, 241, 0.2);
		--shadow-colored-lg: 0 20px 40px rgba(99, 102, 241, 0.3);
	}

	.workspace-container {
		display: flex;
		min-height: 100vh;
		background: var(--background);
		font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
		position: relative;
		overflow: hidden;
	}

	.workspace-container::before {
		content: '';
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: linear-gradient(135deg,
			rgba(99, 102, 241, 0.1) 0%,
			rgba(236, 72, 153, 0.1) 35%,
			rgba(245, 158, 11, 0.1) 70%,
			rgba(16, 185, 129, 0.1) 100%);
		z-index: 0;
	}

	.sidebar, .main-content {
		position: relative;
		z-index: 1;
	}

	/* Sidebar */
	.sidebar {
		width: 280px;
		background: var(--surface);
		border-right: 1px solid var(--border);
		display: flex;
		flex-direction: column;
		box-shadow: var(--shadow);
		position: relative;
		z-index: 10;
	}

	.sidebar-header {
		padding: 2rem 1.5rem;
		border-bottom: 1px solid var(--border);
	}

	.app-title {
		font-size: 1.5rem;
		font-weight: 800;
		color: var(--primary);
		margin-bottom: 1rem;
	}

	.user-info {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.user-avatar {
		width: 40px;
		height: 40px;
		border-radius: 50%;
		background: linear-gradient(135deg, var(--primary), var(--secondary));
		display: flex;
		align-items: center;
		justify-content: center;
		color: white;
		font-weight: 600;
		font-size: 1.1rem;
	}

	.user-name {
		font-weight: 500;
		color: var(--text);
	}

	.categories {
		flex: 1;
		padding: 1.5rem;
	}

	.categories h3 {
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--text-muted);
		margin-bottom: 1rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.category-item {
		width: 100%;
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.75rem 1rem;
		border: none;
		background: none;
		border-radius: 12px;
		cursor: pointer;
		transition: all 0.2s ease;
		margin-bottom: 0.25rem;
		color: var(--text);
	}

	.category-item:hover {
		background: var(--background);
		transform: translateX(4px);
	}

	.category-item.active {
		background: linear-gradient(135deg, var(--category-color), transparent);
		background-color: var(--category-color);
		color: white;
		font-weight: 500;
	}

	.category-icon {
		font-size: 1.2rem;
	}

	.category-name {
		flex: 1;
	}

	.task-count {
		background: rgba(255, 255, 255, 0.2);
		padding: 0.25rem 0.5rem;
		border-radius: 12px;
		font-size: 0.75rem;
		font-weight: 600;
	}

	.category-item:not(.active) .task-count {
		background: var(--border);
		color: var(--text-muted);
	}

	.sidebar-footer {
		padding: 1.5rem;
		border-top: 1px solid var(--border);
	}

	.logout-btn {
		width: 100%;
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.75rem 1rem;
		border: none;
		background: none;
		border-radius: 8px;
		cursor: pointer;
		color: var(--text-muted);
		transition: all 0.2s ease;
	}

	.logout-btn:hover {
		background: var(--background);
		color: var(--accent);
	}

	/* Main Content */
	.main-content {
		flex: 1;
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}

	.content-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		padding: 2rem;
		background: var(--surface);
		border-bottom: 1px solid var(--border);
		gap: 2rem;
		flex-wrap: wrap;
	}

	.page-title {
		font-size: 2rem;
		font-weight: 700;
		color: var(--text);
		margin-bottom: 0.5rem;
	}

	.task-stats {
		color: var(--text-muted);
		font-size: 0.875rem;
	}

	.header-actions {
		display: flex;
		gap: 1rem;
		align-items: center;
		flex-wrap: wrap;
	}

	.search-container {
		position: relative;
	}

	.search-input {
		padding: 0.75rem 1rem 0.75rem 2.5rem;
		border: 1px solid var(--border);
		border-radius: 12px;
		background: var(--surface);
		font-size: 0.875rem;
		outline: none;
		transition: all 0.2s ease;
		width: 240px;
	}

	.search-input:focus {
		border-color: var(--primary);
		box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
	}

	.search-icon {
		position: absolute;
		left: 0.75rem;
		top: 50%;
		transform: translateY(-50%);
		color: var(--text-muted);
	}

	.toggle-completed {
		padding: 0.75rem 1rem;
		border: 1px solid var(--border);
		border-radius: 12px;
		background: var(--surface);
		cursor: pointer;
		transition: all 0.2s ease;
		color: var(--text);
		font-size: 0.875rem;
	}

	.toggle-completed:hover,
	.toggle-completed.active {
		background: var(--primary);
		color: white;
		border-color: var(--primary);
	}

	.view-mode-selector {
		display: flex;
		gap: 0.5rem;
		border: 1px solid var(--border);
		border-radius: 12px;
		padding: 0.25rem;
		background: var(--surface);
	}

	.view-btn {
		padding: 0.5rem 1rem;
		border: none;
		border-radius: 8px;
		background: none;
		cursor: pointer;
		color: var(--text);
		font-size: 0.875rem;
		font-weight: 500;
		transition: all 0.2s ease;
	}

	.view-btn:hover {
		background: var(--background);
	}

	.view-btn.active {
		background: var(--primary);
		color: white;
	}

	/* Add Task */
	.add-task-container {
		padding: 2rem;
		background: var(--surface);
		border-bottom: 1px solid var(--border);
	}


	.add-task-form {
		display: flex;
		gap: 1rem;
		align-items: center;
		flex-wrap: wrap;
	}

	.new-task-input {
		flex: 1;
		min-width: 300px;
		padding: 1rem 1.5rem;
		border: 2px solid var(--border);
		border-radius: 16px;
		background: var(--background);
		font-size: 1rem;
		outline: none;
		transition: all 0.2s ease;
	}

	.new-task-input:focus {
		border-color: var(--primary);
		background: var(--surface);
		box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
	}

	.category-select {
		padding: 1rem;
		border: 2px solid var(--border);
		border-radius: 12px;
		background: var(--surface);
		outline: none;
		cursor: pointer;
		flex: 1;
		min-width: 150px;
	}

	.add-task-btn {
		padding: 1rem 2rem;
		background: linear-gradient(135deg, var(--primary), var(--secondary));
		color: white;
		border: none;
		border-radius: 12px;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.3s ease;
		box-shadow: var(--shadow);
	}

	.add-task-btn:hover:not(:disabled) {
		transform: translateY(-2px);
		box-shadow: var(--shadow-lg);
	}

	.add-task-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
		transform: none;
	}

	/* Tasks */
	.tasks-container {
		flex: 1;
		padding: 2rem;
		overflow-y: auto;
	}

	.empty-state {
		text-align: center;
		padding: 4rem 2rem;
		color: var(--text-muted);
	}

	.empty-icon {
		font-size: 4rem;
		margin-bottom: 1rem;
	}

	.tasks-list {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.task-item {
		display: flex;
		align-items: center;
		gap: 1rem;
		padding: 1.5rem;
		background: var(--surface);
		border-radius: 16px;
		border-left: 4px solid var(--category-color);
		box-shadow: var(--shadow);
		transition: all 0.3s ease;
		cursor: grab;
	}

	.task-item:hover {
		transform: translateY(-2px);
		box-shadow: var(--shadow-lg);
	}

	.task-item.completed {
		opacity: 0.7;
		background: var(--background);
	}

	.task-item.editing {
		background: linear-gradient(135deg, var(--primary), transparent);
		background-color: rgba(102, 126, 234, 0.05);
	}

	.task-checkbox {
		width: 24px;
		height: 24px;
		border: 2px solid var(--border);
		border-radius: 6px;
		background: var(--surface);
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: all 0.2s ease;
		color: white;
		font-weight: 600;
	}

	.task-checkbox.checked {
		background: var(--primary);
		border-color: var(--primary);
	}

	.task-content {
		flex: 1;
	}

	.task-text {
		font-size: 1rem;
		color: var(--text);
		margin-bottom: 0.5rem;
		cursor: text;
		line-height: 1.5;
	}

	/* Rich text styling in tasks */
	.task-text :global(h1),
	.task-text :global(h2),
	.task-text :global(h3) {
		margin: 0.5rem 0;
		font-size: 1rem;
		font-weight: 600;
	}

	.task-text :global(p) {
		margin: 0.25rem 0;
	}

	.task-text :global(ul),
	.task-text :global(ol) {
		margin: 0.25rem 0;
		padding-left: 1rem;
	}

	.task-text :global(blockquote) {
		border-left: 3px solid var(--primary);
		padding-left: 0.75rem;
		margin: 0.25rem 0;
		font-style: italic;
		opacity: 0.8;
	}

	.task-text :global(pre) {
		background: var(--background);
		padding: 0.5rem;
		border-radius: 4px;
		font-size: 0.875rem;
		overflow-x: auto;
	}

	.task-item.completed .task-text {
		text-decoration: line-through;
		color: var(--text-muted);
	}

	.edit-input {
		width: 100%;
		padding: 0.5rem;
		border: 2px solid var(--primary);
		border-radius: 8px;
		font-size: 1rem;
		outline: none;
		background: var(--surface);
	}

	.task-meta {
		display: flex;
		gap: 1rem;
		font-size: 0.75rem;
		color: var(--text-muted);
	}

	.task-category {
		display: flex;
		align-items: center;
		gap: 0.25rem;
	}

	.task-actions {
		display: flex;
		gap: 0.5rem;
	}

	.action-btn {
		width: 32px;
		height: 32px;
		border: none;
		border-radius: 8px;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: all 0.2s ease;
		font-size: 0.875rem;
	}

	.action-btn.edit {
		background: rgba(254, 202, 87, 0.1);
		color: #f39c12;
	}

	.action-btn.delete {
		background: rgba(255, 107, 107, 0.1);
		color: #e74c3c;
	}

	.action-btn.save {
		background: rgba(76, 175, 80, 0.1);
		color: #27ae60;
	}

	.action-btn.cancel {
		background: rgba(158, 158, 158, 0.1);
		color: #7f8c8d;
	}

	.action-btn:hover {
		transform: scale(1.1);
		opacity: 0.8;
	}

	/* Responsive */
	@media (max-width: 1024px) {
		.sidebar {
			width: 240px;
		}
	}

	@media (max-width: 768px) {
		.workspace-container {
			flex-direction: column;
		}
		
		.sidebar {
			width: 100%;
			height: auto;
		}
		
		.content-header {
			flex-direction: column;
			align-items: stretch;
		}
		
		.header-actions {
			justify-content: stretch;
		}
		
		.search-input {
			width: 100%;
		}
		
		.add-task-form {
			flex-direction: column;
		}
		
		.new-task-input {
			min-width: auto;
		}
	}
</style>
