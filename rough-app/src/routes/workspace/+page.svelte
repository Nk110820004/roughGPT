<script>
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import RichTextEditor from '$lib/RichTextEditor.svelte';
	import BoardView from '$lib/BoardView.svelte';
	import AnimatedIcon from '$lib/AnimatedIcon.svelte';
	import FloatingActionButton from '$lib/FloatingActionButton.svelte';
	import { animate as anime } from 'animejs';

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
	let showQuickAdd = $state(false);
	let isDisconnecting = $state(false);

	const categories = [
		{ id: 'all', name: 'All Tasks', icon: 'ALL', color: '#6366f1' },
		{ id: 'personal', name: 'Personal', icon: 'PER', color: '#ec4899' },
		{ id: 'work', name: 'Work', icon: 'WRK', color: '#8b5cf6' },
		{ id: 'shopping', name: 'Shopping', icon: 'SHP', color: '#06b6d4' },
		{ id: 'health', name: 'Health', icon: 'HTH', color: '#10b981' },
		{ id: 'learning', name: 'Learning', icon: 'LRN', color: '#f59e0b' }
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

	async function addTodo() {
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
			await saveTodos();
		}
	}

	async function toggleTodo(id) {
		todos = todos.map(todo =>
			todo.id === id ? { ...todo, completed: !todo.completed } : todo
		);
		await saveTodos();
	}

	async function deleteTodo(id) {
		console.log('Deleting task with ID:', id);
		const taskToDelete = todos.find(todo => todo.id === id);
		if (taskToDelete) {
			console.log('Deleting task:', taskToDelete.text);
		}
		todos = todos.filter(todo => todo.id !== id);
		await saveTodos();
		console.log('Task deleted, remaining tasks:', todos.length);
	}

	async function updateTodo(updatedTodo) {
		todos = todos.map(todo =>
			todo.id === updatedTodo.id ? updatedTodo : todo
		);
		await saveTodos();
	}

	function startEdit(todo) {
		editingId = todo.id;
		editText = todo.text;
	}

	async function saveEdit() {
		if (editText.trim()) {
			todos = todos.map(todo =>
				todo.id === editingId ? { ...todo, text: editText.trim() } : todo
			);
		}
		editingId = null;
		editText = '';
		await saveTodos();
	}

	function quickAddTask() {
		showQuickAdd = true;
		// Scroll to add task section
		document.querySelector('.add-task-container')?.scrollIntoView({
			behavior: 'smooth',
			block: 'center'
		});
		// Focus on input
		setTimeout(() => {
			document.querySelector('.new-task-input')?.focus();
		}, 500);
	}

	function cancelEdit() {
		editingId = null;
		editText = '';
	}

	async function saveTodos() {
		// Save locally first
		localStorage.setItem('todos', JSON.stringify(todos));
		console.log('Saving todos to Pinecone:', todos.length, 'tasks');

		// Save to Pinecone
		const apiKey = localStorage.getItem('pineconeApiKey');
		if (apiKey) {
			try {
				// Delete existing user data first
				console.log('Deleting existing user data from Pinecone...');
				const deleteResponse = await fetch('/delete-note', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						apiKey: apiKey,
						fullText: `User: ${userName}`
					})
				});

				if (!deleteResponse.ok) {
					console.warn('Delete operation had issues, but continuing...');
				}

				// Save updated data if there are todos
				if (todos.length > 0) {
					const todosText = todos.map(todo =>
						`Task: ${todo.text} | Category: ${todo.category} | Priority: ${todo.priority} | Status: ${todo.completed ? 'completed' : 'pending'} | Created: ${new Date(todo.createdAt).toISOString()} | ID: ${todo.id}`
					).join('\n');

					console.log('Inserting todos to Pinecone:', todosText.substring(0, 100) + '...');
					const insertResponse = await fetch('/insert-note', {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({
							apiKey: apiKey,
							fullText: `User: ${userName}\nTaskData:\n${todosText}`
						})
					});

					if (insertResponse.ok) {
						console.log('Successfully saved tasks to Pinecone');
					} else {
						console.error('Failed to insert tasks to Pinecone:', await insertResponse.text());
					}
				} else {
					console.log('No tasks to save to Pinecone');
				}
			} catch (error) {
				console.error('Failed to save to Pinecone:', error);
			}
		}
	}

	async function loadTodos() {
		console.log('Loading todos for user:', userName);
		// Try to load from Pinecone first
		const apiKey = localStorage.getItem('pineconeApiKey');
		if (apiKey) {
			try {
				console.log('Searching for tasks in Pinecone...');
				const response = await fetch('/search-note', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						apiKey: apiKey,
						text: `User: ${userName} TaskData`
					})
				});

				if (response.ok) {
					const results = await response.json();
					console.log('Pinecone search results:', results);
					const userTasks = results.data?.find(item =>
						item && item.includes(`User: ${userName}`) && item.includes('TaskData:')
					);

					if (userTasks) {
						console.log('Found user tasks:', userTasks.substring(0, 200) + '...');
						const tasksSection = userTasks.split('TaskData:')[1];
						if (tasksSection) {
							const taskLines = tasksSection.trim().split('\n').filter(line => line.trim());
							const loadedTodos = [];

							taskLines.forEach(line => {
								const taskMatch = line.match(/Task: (.*?) \| Category: (.*?) \| Priority: (.*?) \| Status: (.*?) \| Created: (.*?) \| ID: (.*?)$/);
								if (taskMatch) {
									const [, text, category, priority, status, createdAt, id] = taskMatch;
									loadedTodos.push({
										id: parseInt(id) || Date.now() + Math.random(),
										text: text.trim(),
										completed: status === 'completed',
										category: category.trim(),
										priority: priority.trim(),
										createdAt: new Date(createdAt),
										isRichText: false
									});
								}
							});

							console.log('Loaded todos from Pinecone:', loadedTodos.length, 'tasks');
							if (loadedTodos.length > 0) {
								todos = loadedTodos;
								localStorage.setItem('todos', JSON.stringify(todos));
								return;
							}
						}
					} else {
						console.log('No user tasks found in Pinecone search results');
					}
				} else {
					console.error('Pinecone search failed:', await response.text());
				}
			} catch (error) {
				console.error('Failed to load from Pinecone, falling back to localStorage:', error);
			}
		}

		// Fallback to localStorage
		console.log('Loading from localStorage...');
		const saved = localStorage.getItem('todos');
		if (saved) {
			const localTodos = JSON.parse(saved);
			console.log('Loaded from localStorage:', localTodos.length, 'tasks');
			todos = localTodos;
		} else {
			console.log('No tasks found in localStorage');
		}
	}

	async function searchInPinecone(query) {
		const apiKey = localStorage.getItem('pineconeApiKey');
		if (!apiKey || !query.trim()) return [];

		try {
			const response = await fetch('/search-note', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					apiKey: apiKey,
					text: query
				})
			});

			if (response.ok) {
				const results = await response.json();
				return results.matches || [];
			}
		} catch (error) {
			console.error('Pinecone search failed:', error);
		}
		return [];
	}

	function logout() {
		localStorage.removeItem('userName');
		localStorage.removeItem('todos');
		goto('/');
	}

	function disconnectAPI() {
		isDisconnecting = true;

		// Remove all API-related data
		localStorage.removeItem('pineconeApiKey');
		localStorage.removeItem('pineconeConnected');
		localStorage.removeItem('userName');
		localStorage.removeItem('todos');

		// Clear any other app-specific data
		localStorage.clear();

		// Show success animation
		anime({
			targets: '.disconnect-btn',
			scale: [1, 1.2, 1],
			duration: 300,
			easing: 'easeOutBounce',
			complete: () => {
				// Redirect to homepage after animation completes
				goto('/');
			}
		});
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

	onMount(async () => {
		const savedName = localStorage.getItem('userName');
		const pineconeConnected = localStorage.getItem('pineconeConnected');
		const apiKey = localStorage.getItem('pineconeApiKey');

		if (!savedName || !pineconeConnected || !apiKey) {
			goto('/');
			return;
		}
		userName = savedName;
		await loadTodos();

		// Entry animations
		anime.timeline({
			easing: 'easeOutExpo'
		})
		.add({
			targets: '.sidebar',
			translateX: [-280, 0],
			opacity: [0, 1],
			duration: 800
		})
		.add({
			targets: '.main-content',
			translateX: [50, 0],
			opacity: [0, 1],
			duration: 600
		}, '-=400')
		.add({
			targets: '.category-item',
			translateX: [-20, 0],
			opacity: [0, 1],
			duration: 400,
			delay: anime.stagger(100)
		}, '-=300')
		.add({
			targets: '.task-item',
			scale: [0.8, 1],
			opacity: [0, 1],
			duration: 500,
			delay: anime.stagger(50)
		}, '-=200');
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
				<div class="user-details">
					<span class="user-name">{userName}</span>
					<div class="connection-status">
						<div class="status-indicator"></div>
						<span>Pinecone Connected</span>
					</div>
				</div>
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
			<button class="disconnect-btn" onclick={disconnectAPI} disabled={isDisconnecting}>
				{#if isDisconnecting}
					<div class="loading-spinner-small"></div>
					Disconnecting...
				{:else}
					<AnimatedIcon name="disconnect" size={20} rotation={true} />
					Disconnect Pinecone
				{/if}
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
					<div class="search-icon">
						<AnimatedIcon name="search" size={18} pulse={true} />
					</div>
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
					{showCompleted ? 'Hide' : 'Show'} Completed
				</button>
			</div>
		</header>

		<!-- Add New Task -->
		<div class="add-task-container">
			<div class="add-task-form">
				<input
					type="text"
					placeholder="What would you like to accomplish today?"
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
					<AnimatedIcon name="add" size={20} rotation={true} />
					<span>Add Task</span>
				</button>
			</div>
		</div>

		<!-- Tasks Display -->
		<div class="tasks-container">
			{#if filteredTodos.length === 0}
				<div class="empty-state">
					<div class="empty-icon">
						<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z"/>
							<path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/>
						</svg>
					</div>
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
									<button onclick={saveEdit} class="action-btn save">
										<AnimatedIcon name="check" size={16} bounce={true} />
									</button>
									<button onclick={cancelEdit} class="action-btn cancel">
										<AnimatedIcon name="close" size={16} />
									</button>
								{:else}
									<button onclick={() => startEdit(todo)} class="action-btn edit">
										<AnimatedIcon name="edit" size={16} hoverScale={1.2} />
									</button>
									<button onclick={() => deleteTodo(todo.id)} class="action-btn delete">
										<AnimatedIcon name="delete" size={16} hoverScale={1.2} rotation={true} />
									</button>
								{/if}
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</div>
	</main>

	<!-- Floating Action Button for quick task creation -->
	<FloatingActionButton onclick={quickAddTask} />
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
		backdrop-filter: blur(20px);
		border-right: 1px solid var(--border);
		display: flex;
		flex-direction: column;
		box-shadow: var(--shadow-colored);
		position: relative;
		z-index: 10;
		border-radius: 0 20px 20px 0;
		overflow: hidden;
	}

	.sidebar::before {
		content: '';
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: linear-gradient(180deg,
			rgba(99, 102, 241, 0.05) 0%,
			rgba(236, 72, 153, 0.05) 50%,
			rgba(245, 158, 11, 0.05) 100%);
		z-index: -1;
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

	.user-details {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
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

	.connection-status {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.75rem;
		color: var(--success);
	}

	.status-indicator {
		width: 8px;
		height: 8px;
		background: var(--success);
		border-radius: 50%;
		animation: pulse-green 2s infinite;
	}

	@keyframes pulse-green {
		0% { opacity: 1; }
		50% { opacity: 0.5; }
		100% { opacity: 1; }
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
		background: linear-gradient(135deg, var(--category-color), rgba(255, 255, 255, 0.1));
		background-color: var(--category-color);
		color: white;
		font-weight: 500;
		box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
		transform: translateX(4px) scale(1.02);
	}

	.category-icon {
		font-size: 0.75rem;
		font-weight: 700;
		background: rgba(255, 255, 255, 0.2);
		padding: 0.25rem 0.4rem;
		border-radius: 6px;
		letter-spacing: 0.5px;
		min-width: 32px;
		text-align: center;
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

	.logout-btn,
	.disconnect-btn {
		width: 100%;
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.75rem 1rem;
		border: none;
		background: none;
		border-radius: 12px;
		cursor: pointer;
		color: var(--text-muted);
		transition: all 0.3s ease;
		margin-bottom: 0.5rem;
		font-weight: 500;
	}

	.logout-btn:hover {
		background: linear-gradient(135deg, var(--danger), rgba(239, 68, 68, 0.8));
		color: white;
		transform: translateX(4px);
		box-shadow: var(--shadow);
	}

	.disconnect-btn {
		border: 1px solid rgba(245, 158, 11, 0.2);
	}

	.disconnect-btn:hover:not(:disabled) {
		background: linear-gradient(135deg, var(--warning), rgba(245, 158, 11, 0.8));
		color: white;
		transform: translateX(4px);
		box-shadow: var(--shadow);
		border-color: var(--warning);
	}

	.disconnect-btn:disabled {
		opacity: 0.6;
		cursor: not-allowed;
		transform: none;
	}

	.loading-spinner-small {
		display: inline-block;
		width: 16px;
		height: 16px;
		border: 2px solid rgba(255, 255, 255, 0.3);
		border-radius: 50%;
		border-top-color: currentColor;
		animation: spin 1s ease-in-out infinite;
		margin-right: 0.5rem;
	}

	@keyframes spin {
		to { transform: rotate(360deg); }
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
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem 1rem;
		border: none;
		border-radius: 8px;
		background: none;
		cursor: pointer;
		color: var(--text);
		font-size: 0.875rem;
		font-weight: 500;
		transition: all 0.3s ease;
	}

	.view-btn:hover {
		background: var(--background-light);
		transform: translateY(-1px);
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
	}

	.view-btn.active {
		background: linear-gradient(135deg, var(--primary), var(--primary-light));
		color: white;
		box-shadow: var(--shadow-colored);
		transform: translateY(-1px);
	}

	/* Add Task */
	.add-task-container {
		padding: 2rem;
		background: var(--surface);
		border-bottom: 1px solid var(--border);
		position: relative;
		z-index: 2;
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
		background: var(--surface);
		font-size: 1rem;
		outline: none;
		transition: all 0.2s ease;
		color: var(--text);
		position: relative;
		z-index: 10;
		pointer-events: auto;
		user-select: text;
		cursor: text;
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
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 1rem 2rem;
		background: linear-gradient(135deg, var(--primary), var(--secondary));
		color: white;
		border: none;
		border-radius: 16px;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.3s ease;
		box-shadow: var(--shadow-colored);
		position: relative;
		overflow: hidden;
	}

	.add-task-btn::before {
		content: '';
		position: absolute;
		top: 0;
		left: -100%;
		width: 100%;
		height: 100%;
		background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
		transition: left 0.5s ease;
	}

	.add-task-btn:hover::before {
		left: 100%;
	}

	.add-task-btn:hover:not(:disabled) {
		transform: translateY(-3px) scale(1.02);
		box-shadow: var(--shadow-colored-lg);
		background: linear-gradient(135deg, var(--primary-light), var(--secondary-light));
	}

	.add-task-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
		transform: none;
		box-shadow: var(--shadow);
	}

	.add-task-btn:disabled::before {
		display: none;
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
		color: white;
		text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
	}

	.empty-state h3 {
		color: white;
		font-size: 1.5rem;
		margin-bottom: 0.5rem;
		text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
	}

	.empty-state p {
		color: rgba(255, 255, 255, 0.9);
		font-size: 1rem;
		text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
	}

	.empty-icon {
		margin-bottom: 1rem;
		color: white;
		opacity: 0.8;
		filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));
	}

	.empty-icon svg {
		width: 48px;
		height: 48px;
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
		border-radius: 20px;
		border-left: 6px solid var(--category-color);
		box-shadow: var(--shadow);
		transition: all 0.3s ease;
		cursor: grab;
		position: relative;
		overflow: hidden;
	}

	.task-item::before {
		content: '';
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: linear-gradient(135deg,
			rgba(99, 102, 241, 0.02) 0%,
			rgba(236, 72, 153, 0.02) 50%,
			rgba(245, 158, 11, 0.02) 100%);
		z-index: -1;
	}

	.task-item:hover {
		transform: translateY(-4px) scale(1.01);
		box-shadow: 0 15px 35px rgba(0, 0, 0, 0.12);
		border-left-width: 8px;
	}

	.task-item:hover::before {
		background: linear-gradient(135deg,
			rgba(99, 102, 241, 0.05) 0%,
			rgba(236, 72, 153, 0.05) 50%,
			rgba(245, 158, 11, 0.05) 100%);
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
