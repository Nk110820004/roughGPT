<script>
	import AnimatedIcon from './AnimatedIcon.svelte';

	let {
		todos = [],
		onUpdateTodo = () => {},
		onDeleteTodo = () => {},
		categories = []
	} = $props();

	const columns = [
		{ id: 'todo', title: 'To Do', color: '#ff6b6b' },
		{ id: 'in_progress', title: 'In Progress', color: '#feca57' },
		{ id: 'review', title: 'Review', color: '#48cae4' },
		{ id: 'done', title: 'Done', color: '#96ceb4' }
	];

	let draggedTodo = $state(null);

	// Group todos by status
	let todosByStatus = $derived({
		todo: todos.filter(t => !t.status || t.status === 'todo'),
		in_progress: todos.filter(t => t.status === 'in_progress'),
		review: todos.filter(t => t.status === 'review'),
		done: todos.filter(t => t.completed || t.status === 'done')
	});

	function handleDragStart(event, todo) {
		draggedTodo = todo;
		event.dataTransfer.effectAllowed = 'move';
		event.dataTransfer.setData('text/html', event.target.outerHTML);
	}

	function handleDragOver(event) {
		event.preventDefault();
		event.dataTransfer.dropEffect = 'move';
	}

	function handleDrop(event, newStatus) {
		event.preventDefault();
		if (draggedTodo && draggedTodo.status !== newStatus) {
			const updatedTodo = { 
				...draggedTodo, 
				status: newStatus,
				completed: newStatus === 'done'
			};
			onUpdateTodo(updatedTodo);
		}
		draggedTodo = null;
	}

	function getCategoryInfo(categoryId) {
		return categories.find(c => c.id === categoryId) || { icon: '📋', color: '#667eea' };
	}

	function formatDate(date) {
		return new Date(date).toLocaleDateString('en-US', { 
			month: 'short', 
			day: 'numeric' 
		});
	}

	function getPriorityColor(priority) {
		switch (priority) {
			case 'high': return '#ff4757';
			case 'medium': return '#ffa502';
			case 'low': return '#7bed9f';
			default: return '#ddd';
		}
	}
</script>

<div class="board-container">
	{#each columns as column}
		<div 
			class="column"
			style="--column-color: {column.color}"
			ondragover={handleDragOver}
			ondrop={(e) => handleDrop(e, column.id)}
			role="region"
			aria-label="{column.title} column"
		>
			<div class="column-header">
				<h3 class="column-title">{column.title}</h3>
				<span class="task-count">{todosByStatus[column.id]?.length || 0}</span>
			</div>

			<div class="tasks-column">
				{#each (todosByStatus[column.id] || []) as todo (todo.id)}
					{@const categoryInfo = getCategoryInfo(todo.category)}
					<div
						class="board-task"
						class:completed={todo.completed}
						draggable="true"
						ondragstart={(e) => handleDragStart(e, todo)}
						style="--category-color: {categoryInfo.color}"
						role="button"
						tabindex="0"
						onkeydown={(e) => {
							if (e.key === 'Delete') {
								onDeleteTodo(todo.id);
							}
						}}
					>
						<div class="task-header">
							<div class="task-category">
								<span class="category-icon">{categoryInfo.icon}</span>
								<span class="category-name">{categoryInfo.name}</span>
							</div>
							{#if todo.priority}
								<div 
									class="priority-indicator"
									style="background-color: {getPriorityColor(todo.priority)}"
									title="{todo.priority} priority"
								></div>
							{/if}
						</div>

						<div class="task-content">
							<div class="task-text">
								{@html todo.text || todo.title || 'Untitled Task'}
							</div>
						</div>

						<div class="task-footer">
							<div class="task-meta">
								<span class="task-date">
									{formatDate(todo.createdAt)}
								</span>
								{#if todo.dueDate}
									<span class="due-date" class:overdue={new Date(todo.dueDate) < new Date()}>
										Due: {formatDate(todo.dueDate)}
									</span>
								{/if}
							</div>
							
							<div class="task-actions">
								<button
									class="action-btn edit"
									onclick={() => onUpdateTodo({...todo, editing: true})}
									title="Edit task"
								>
									<AnimatedIcon name="edit" size={14} hoverScale={1.2} />
								</button>
								<button
									class="action-btn delete"
									onclick={() => onDeleteTodo(todo.id)}
									title="Delete task"
								>
									<AnimatedIcon name="delete" size={14} hoverScale={1.2} rotation={true} />
								</button>
							</div>
						</div>

						{#if todo.tags && todo.tags.length > 0}
							<div class="task-tags">
								{#each todo.tags as tag}
									<span class="tag">{tag}</span>
								{/each}
							</div>
						{/if}
					</div>
				{/each}

				{#if (todosByStatus[column.id]?.length || 0) === 0}
					<div class="empty-column">
						<div class="empty-icon">
							<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
								<path d="M9 12l2 2 4-4"/>
								<path d="M21 12c.552 0 1-.449 1-1V5c0-.551-.448-1-1-1H3c-.552 0-1 .449-1 1v6c0 .551.448 1 1 1h18z"/>
								<path d="M3 12v7c0 .551.448 1 1 1h16c.552 0 1-.449 1-1v-7"/>
							</svg>
						</div>
						<p>No tasks in {column.title.toLowerCase()}</p>
					</div>
				{/if}
			</div>
		</div>
	{/each}
</div>

<style>
	.board-container {
		display: flex;
		gap: 1.5rem;
		padding: 1rem;
		min-height: 600px;
		overflow-x: auto;
		background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
		border-radius: 12px;
	}

	.column {
		flex: 1;
		min-width: 280px;
		max-width: 350px;
		background: rgba(255, 255, 255, 0.9);
		border-radius: 12px;
		box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
		backdrop-filter: blur(10px);
		border: 1px solid rgba(255, 255, 255, 0.2);
		display: flex;
		flex-direction: column;
		overflow: hidden;
		transition: all 0.3s ease;
	}

	.column:hover {
		box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
		transform: translateY(-2px);
	}

	.column-header {
		padding: 1.25rem 1.5rem;
		border-bottom: 2px solid var(--column-color);
		background: linear-gradient(135deg, var(--column-color), transparent);
		background-color: rgba(255, 255, 255, 0.95);
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.column-title {
		font-size: 1.1rem;
		font-weight: 600;
		color: var(--text, #2d3748);
		margin: 0;
	}

	.task-count {
		background: var(--column-color);
		color: white;
		padding: 0.25rem 0.75rem;
		border-radius: 20px;
		font-size: 0.8rem;
		font-weight: 600;
		min-width: 24px;
		text-align: center;
	}

	.tasks-column {
		flex: 1;
		padding: 1rem;
		display: flex;
		flex-direction: column;
		gap: 1rem;
		overflow-y: auto;
		scrollbar-width: thin;
		scrollbar-color: rgba(0, 0, 0, 0.2) transparent;
	}

	.tasks-column::-webkit-scrollbar {
		width: 6px;
	}

	.tasks-column::-webkit-scrollbar-track {
		background: transparent;
	}

	.tasks-column::-webkit-scrollbar-thumb {
		background: rgba(0, 0, 0, 0.2);
		border-radius: 3px;
	}

	.board-task {
		background: white;
		border-radius: 10px;
		padding: 1rem;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
		border-left: 4px solid var(--category-color);
		cursor: grab;
		transition: all 0.3s ease;
		position: relative;
		min-height: 120px;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.board-task:hover {
		box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
		transform: translateY(-2px);
	}

	.board-task:active {
		cursor: grabbing;
	}

	.board-task.completed {
		opacity: 0.7;
		background: #f8f9fa;
	}

	.task-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.task-category {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.8rem;
		color: var(--text-muted, #718096);
	}

	.category-icon {
		font-size: 1rem;
	}

	.priority-indicator {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		flex-shrink: 0;
	}

	.task-content {
		flex: 1;
	}

	.task-text {
		font-size: 0.95rem;
		line-height: 1.5;
		color: var(--text, #2d3748);
		word-wrap: break-word;
	}

	.task-text :global(h1),
	.task-text :global(h2),
	.task-text :global(h3) {
		margin: 0.5rem 0;
		font-size: 1rem;
	}

	.task-text :global(p) {
		margin: 0.25rem 0;
	}

	.task-text :global(ul),
	.task-text :global(ol) {
		margin: 0.25rem 0;
		padding-left: 1rem;
	}

	.task-footer {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-top: auto;
	}

	.task-meta {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		font-size: 0.75rem;
		color: var(--text-muted, #718096);
	}

	.due-date {
		color: #f39c12;
	}

	.due-date.overdue {
		color: #e74c3c;
		font-weight: 600;
	}

	.task-actions {
		display: flex;
		gap: 0.25rem;
		opacity: 0;
		transition: opacity 0.2s ease;
	}

	.board-task:hover .task-actions {
		opacity: 1;
	}

	.action-btn {
		width: 24px;
		height: 24px;
		border: none;
		border-radius: 4px;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 0.7rem;
		transition: all 0.2s ease;
	}

	.action-btn.edit {
		background: rgba(254, 202, 87, 0.1);
		color: #f39c12;
	}

	.action-btn.delete {
		background: rgba(255, 107, 107, 0.1);
		color: #e74c3c;
	}

	.action-btn:hover {
		transform: scale(1.1);
	}

	.task-tags {
		display: flex;
		flex-wrap: wrap;
		gap: 0.375rem;
		margin-top: 0.5rem;
	}

	.tag {
		background: rgba(102, 126, 234, 0.1);
		color: #667eea;
		padding: 0.25rem 0.5rem;
		border-radius: 12px;
		font-size: 0.7rem;
		font-weight: 500;
	}

	.empty-column {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 2rem;
		color: var(--text-muted, #718096);
		text-align: center;
		min-height: 200px;
	}

	.empty-icon {
		margin-bottom: 0.75rem;
		opacity: 0.5;
		color: var(--text-muted, #718096);
	}

	.empty-icon svg {
		width: 32px;
		height: 32px;
	}

	.empty-column p {
		font-size: 0.9rem;
		margin: 0;
	}

	/* Responsive */
	@media (max-width: 768px) {
		.board-container {
			gap: 1rem;
			padding: 0.5rem;
		}
		
		.column {
			min-width: 240px;
		}
		
		.column-header {
			padding: 1rem;
		}
		
		.tasks-column {
			padding: 0.75rem;
		}
		
		.board-task {
			padding: 0.875rem;
			min-height: 100px;
		}
	}
</style>
