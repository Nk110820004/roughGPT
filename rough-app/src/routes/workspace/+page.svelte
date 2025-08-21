<script>
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import RichTextEditor from '$lib/RichTextEditor.svelte';
	import BoardView from '$lib/BoardView.svelte';
	import AnimatedIcon from '$lib/AnimatedIcon.svelte';
	import FloatingActionButton from '$lib/FloatingActionButton.svelte';
	import { animate as anime } from 'animejs';

	let userName = '';
	let todos = $state([]);
	let notes = $state([]);
	let newTodo = $state('');
	let searchQuery = $state('');
	let selectedCategory = $state('all');
	let showCompleted = true;
	let editingId = null;
	let editText = '';
	let draggedItem = null;
	let currentView = $state('list'); // 'list', 'board', 'notes'
	let showRichEditor = false;
	let newTodoRichText = '';
	let showQuickAdd = false;
	let isDisconnecting = $state(false);

	let currentNote = $state({
		id: null,
		title: '',
		content: '',
		type: 'note', // 'note', 'todo', 'checklist'
		fontSize: 16,
		fontFamily: 'Inter',
		fontColor: '#1f2937',
		fontWeight: 400,
		backgroundColor: '#ffffff',
		tags: [],
		createdAt: new Date(),
		updatedAt: new Date()
	});

	let showNoteEditor = $state(false);
	let selectedFont = $state('Inter');
	let selectedFontSize = $state(16);
	let selectedFontColor = $state('#1f2937');
	let selectedFontWeight = $state(400);
	let showFormulaEditor = $state(false);
	let formulaInput = $state('');
	let mathFormulas = $state([]);

	const fontOptions = [
		{ name: 'Inter', value: 'Inter, sans-serif' },
		{ name: 'Roboto', value: 'Roboto, sans-serif' },
		{ name: 'Open Sans', value: 'Open Sans, sans-serif' },
		{ name: 'Lato', value: 'Lato, sans-serif' },
		{ name: 'Montserrat', value: 'Montserrat, sans-serif' },
		{ name: 'Poppins', value: 'Poppins, sans-serif' },
		{ name: 'Source Code Pro', value: 'Source Code Pro, monospace' },
		{ name: 'Georgia', value: 'Georgia, serif' },
		{ name: 'Times New Roman', value: 'Times New Roman, serif' }
	];

	const categories = [
		{ id: 'all', name: 'All Items', icon: '🌟', color: '#6366f1', gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' },
		{ id: 'personal', name: 'Personal', icon: '💝', color: '#ec4899', gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' },
		{ id: 'work', name: 'Work', icon: '💼', color: '#8b5cf6', gradient: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)' },
		{ id: 'shopping', name: 'Shopping', icon: '🛍️', color: '#06b6d4', gradient: 'linear-gradient(135deg, #89f7fe 0%, #66a6ff 100%)' },
		{ id: 'health', name: 'Health', icon: '🏃‍♂️', color: '#10b981', gradient: 'linear-gradient(135deg, #a8e6cf 0%, #dcedc1 100%)' },
		{ id: 'learning', name: 'Learning', icon: '📚', color: '#f59e0b', gradient: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)' },
		{ id: 'notes', name: 'Notes', icon: '📝', color: '#8b5cf6', gradient: 'linear-gradient(135deg, #d299c2 0%, #fef9d7 100%)' }
	];

	let selectedTodoCategory = $state('personal');
	let selectedTodoPriority = 'medium';

	let dailyGoal = 8;
	let completedToday = 0;
	let streakDays = 5;
	let totalPoints = 1250;
	let currentLevel = 3;
	let showAchievements = $state(false);
	let showStats = $state(false);
	let currentTheme = 'gradient';
	
	const achievements = [
		{ id: 1, name: 'First Steps', description: 'Complete your first task', icon: '🎯', unlocked: true },
		{ id: 2, name: 'Note Taker', description: 'Create 10 notes', icon: '📝', unlocked: true },
		{ id: 3, name: 'Streak Master', description: '7 day streak', icon: '🔥', unlocked: false },
		{ id: 4, name: 'Productivity Pro', description: 'Complete 50 tasks', icon: '⚡', unlocked: false }
	];

	function createNewNote() {
		currentNote = {
			id: Date.now(),
			title: 'Untitled Note',
			content: '',
			type: 'note',
			fontSize: selectedFontSize,
			fontFamily: selectedFont,
			fontColor: selectedFontColor,
			fontWeight: selectedFontWeight,
			backgroundColor: '#ffffff',
			tags: [],
			category: selectedTodoCategory,
			createdAt: new Date(),
			updatedAt: new Date()
		};
		showNoteEditor = true;
	}

	function editNote(note) {
		currentNote = { ...note };
		selectedFont = note.fontFamily || 'Inter';
		selectedFontSize = note.fontSize || 16;
		selectedFontColor = note.fontColor || '#1f2937';
		selectedFontWeight = note.fontWeight || 400;
		showNoteEditor = true;
	}

	async function saveNote() {
		if (currentNote.title.trim() || currentNote.content.trim()) {
			currentNote.updatedAt = new Date();
			
			const existingIndex = notes.findIndex(n => n.id === currentNote.id);
			if (existingIndex >= 0) {
				notes[existingIndex] = { ...currentNote };
			} else {
				notes = [...notes, { ...currentNote }];
			}
			
			await saveAllData();
			showNoteEditor = false;
		}
	}

	function cancelNoteEdit() {
		showNoteEditor = false;
		currentNote = {
			id: null,
			title: '',
			content: '',
			type: 'note',
			fontSize: 16,
			fontFamily: 'Inter',
			fontColor: '#1f2937',
			fontWeight: 400,
			backgroundColor: '#ffffff',
			tags: [],
			createdAt: new Date(),
			updatedAt: new Date()
		};
	}

	function handleModalOverlayClick(event) {
		// Only close if clicking directly on the overlay, not on child elements
		if (event.target === event.currentTarget) {
			cancelNoteEdit();
		}
	}

	function addFormula() {
		if (formulaInput.trim()) {
			const formula = {
				id: Date.now(),
				latex: formulaInput.trim(),
				rendered: renderLatex(formulaInput.trim())
			};
			mathFormulas = [...mathFormulas, formula];
			
			// Insert formula into current note content
			if (showNoteEditor) {
				currentNote.content += `\n\n$$${formulaInput.trim()}$$\n\n`;
			}
			
			formulaInput = '';
			showFormulaEditor = false;
		}
	}

	function renderLatex(latex) {
		// Simple LaTeX rendering for common formulas
		return latex
			.replace(/\^(\w+)/g, '<sup>$1</sup>')
			.replace(/_(\w+)/g, '<sub>$1</sub>')
			.replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '<span class="fraction"><span class="numerator">$1</span><span class="denominator">$2</span></span>')
			.replace(/\\sqrt\{([^}]+)\}/g, '√($1)')
			.replace(/\\alpha/g, 'α')
			.replace(/\\beta/g, 'β')
			.replace(/\\gamma/g, 'γ')
			.replace(/\\delta/g, 'δ')
			.replace(/\\pi/g, 'π')
			.replace(/\\theta/g, 'θ')
			.replace(/\\lambda/g, 'λ')
			.replace(/\\mu/g, 'μ')
			.replace(/\\sigma/g, 'σ')
			.replace(/\\omega/g, 'ω');
	}

	function applyFormatting(format) {
		const selection = window.getSelection();
		if (selection.rangeCount > 0) {
			const range = selection.getRangeAt(0);
			const selectedText = range.toString();
			
			if (selectedText) {
				let formattedText = '';
				switch (format) {
					case 'bold':
						formattedText = `<strong>${selectedText}</strong>`;
						break;
					case 'italic':
						formattedText = `<em>${selectedText}</em>`;
						break;
					case 'underline':
						formattedText = `<u>${selectedText}</u>`;
						break;
					case 'heading1':
						formattedText = `<h1>${selectedText}</h1>`;
						break;
					case 'heading2':
						formattedText = `<h2>${selectedText}</h2>`;
						break;
					case 'heading3':
						formattedText = `<h3>${selectedText}</h3>`;
						break;
					case 'bullet':
						formattedText = `<ul><li>${selectedText}</li></ul>`;
						break;
					case 'number':
						formattedText = `<ol><li>${selectedText}</li></ol>`;
						break;
					case 'checkbox':
						formattedText = `<input type="checkbox"> ${selectedText}`;
						break;
					case 'radio':
						formattedText = `<input type="radio" name="option"> ${selectedText}`;
						break;
				}
				
				range.deleteContents();
				range.insertNode(document.createRange().createContextualFragment(formattedText));
			}
		}
	}

	function insertElement(type) {
		const content = currentNote.content;
		switch (type) {
			case 'checkbox':
				currentNote.content += '\n☐ New checkbox item';
				break;
			case 'radio':
				currentNote.content += '\n○ New radio option';
				break;
			case 'bullet':
				currentNote.content += '\n• New bullet point';
				break;
			case 'number':
				const numbers = (content.match(/^\d+\./gm) || []).length;
				currentNote.content += `\n${numbers + 1}. New numbered item`;
				break;
			case 'heading':
				currentNote.content += '\n\n# New Heading\n';
				break;
			case 'paragraph':
				currentNote.content += '\n\nNew paragraph text here.\n';
				break;
		}
	}

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
			await saveAllData();
		}
	}

	async function toggleTodo(id) {
		todos = todos.map(todo =>
			todo.id === id ? { ...todo, completed: !todo.completed } : todo
		);
		await saveAllData();
	}

	async function deleteTodo(id) {
		todos = todos.filter(todo => todo.id !== id);
		await saveAllData();
	}

	async function deleteNote(id) {
		notes = notes.filter(note => note.id !== id);
		await saveAllData();
	}

	async function updateTodo(updatedTodo) {
		todos = todos.map(todo =>
			todo.id === updatedTodo.id ? updatedTodo : todo
		);
		await saveAllData();
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
		await saveAllData();
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

	async function saveAllData() {
		// Save to session storage for immediate persistence
		sessionStorage.setItem('todos', JSON.stringify(todos));
		sessionStorage.setItem('notes', JSON.stringify(notes));
		sessionStorage.setItem('mathFormulas', JSON.stringify(mathFormulas));
		
		// Save locally
		localStorage.setItem('todos', JSON.stringify(todos));
		localStorage.setItem('notes', JSON.stringify(notes));
		localStorage.setItem('mathFormulas', JSON.stringify(mathFormulas));

		// Save to Pinecone
		const apiKey = localStorage.getItem('pineconeApiKey');
		if (apiKey) {
			try {
				// Delete existing user data first
				const deleteResponse = await fetch('/delete-note', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						apiKey: apiKey,
						fullText: `User: ${userName}`
					})
				});

				// Save comprehensive user data
				const userData = {
					user: userName,
					todos: todos,
					notes: notes,
					mathFormulas: mathFormulas,
					lastUpdated: new Date().toISOString()
				};

				const userDataText = `User: ${userName}\nData: ${JSON.stringify(userData)}`;

				const insertResponse = await fetch('/insert-note', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						apiKey: apiKey,
						fullText: userDataText
					})
				});

				if (insertResponse.ok) {
					console.log('Successfully saved all data to Pinecone');
				}
			} catch (error) {
				console.error('Failed to save to Pinecone:', error);
			}
		}
	}

	async function loadAllData() {
		// Try session storage first for immediate loading
		const sessionTodos = sessionStorage.getItem('todos');
		const sessionNotes = sessionStorage.getItem('notes');
		const sessionFormulas = sessionStorage.getItem('mathFormulas');

		if (sessionTodos) {
			todos = JSON.parse(sessionTodos);
		}
		if (sessionNotes) {
			notes = JSON.parse(sessionNotes);
		}
		if (sessionFormulas) {
			mathFormulas = JSON.parse(sessionFormulas);
		}

		// Try to load from Pinecone
		const apiKey = localStorage.getItem('pineconeApiKey');
		if (apiKey) {
			try {
				const response = await fetch('/search-note', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						apiKey: apiKey,
						text: `User: ${userName}`
					})
				});

				if (response.ok) {
					const results = await response.json();
					
					if (results.matches && results.matches.length > 0) {
						for (const match of results.matches) {
							const fullText = match.metadata?.text || match.metadata?.full_text || '';
							
							if (fullText.includes(`User: ${userName}\nData:`)) {
								try {
									const dataMatch = fullText.match(/Data:\s*(\{.*\})\s*$/s);
									if (dataMatch) {
										const userData = JSON.parse(dataMatch[1]);
										if (userData.todos) todos = userData.todos;
										if (userData.notes) notes = userData.notes;
										if (userData.mathFormulas) mathFormulas = userData.mathFormulas;
										
										// Update session storage
										sessionStorage.setItem('todos', JSON.stringify(todos));
										sessionStorage.setItem('notes', JSON.stringify(notes));
										sessionStorage.setItem('mathFormulas', JSON.stringify(mathFormulas));
										return;
									}
								} catch (e) {
									console.warn('Failed to parse user data from Pinecone:', e);
								}
							}
						}
					}
				}
			} catch (error) {
				console.error('Failed to load from Pinecone:', error);
			}
		}

		// Fallback to localStorage
		const localTodos = localStorage.getItem('todos');
		const localNotes = localStorage.getItem('notes');
		const localFormulas = localStorage.getItem('mathFormulas');

		if (localTodos && !sessionTodos) {
			todos = JSON.parse(localTodos);
		}
		if (localNotes && !sessionNotes) {
			notes = JSON.parse(localNotes);
		}
		if (localFormulas && !sessionFormulas) {
			mathFormulas = JSON.parse(localFormulas);
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
		localStorage.removeItem('notes');
		localStorage.removeItem('mathFormulas');
		sessionStorage.clear();
		goto('/');
	}

	function disconnectAPI() {
		isDisconnecting = true;
		localStorage.clear();
		sessionStorage.clear();
		
		anime({
			targets: '.disconnect-btn',
			scale: [1, 1.2, 1],
			duration: 300,
			easing: 'easeOutBounce',
			complete: () => {
				isDisconnecting = false;
				goto('/', { replaceState: true });
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
			saveAllData();
		}
		draggedItem = null;
	}

	function handleAchievementsModalClick(event) {
		// Only close if clicking directly on the overlay, not on child elements
		if (event.target === event.currentTarget) {
			showAchievements = false;
		}
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
		await loadAllData();

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
		}, '-=400');
	});
</script>

<div class="workspace-container">
	<!-- Enhanced Sidebar -->
	<aside class="sidebar enhanced-sidebar">
		<!-- Added motivational header with stats -->
		<div class="sidebar-header">
			<div class="user-avatar">
				<div class="avatar-ring">
					<span class="avatar-text">👤</span>
				</div>
				<div class="level-badge">Lv.{currentLevel}</div>
			</div>
			<div class="user-info">
				<h2 class="user-name">Productivity Master</h2>
				<div class="user-stats">
					<div class="stat-item">
						<span class="stat-value">{totalPoints}</span>
						<span class="stat-label">Points</span>
					</div>
					<div class="stat-item">
						<span class="stat-value">{streakDays}</span>
						<span class="stat-label">Streak</span>
					</div>
				</div>
			</div>
		</div>

		<!-- Added daily progress section -->
		<div class="daily-progress">
			<div class="progress-header">
				<h3>Today's Goal</h3>
				<span class="progress-text">{completedToday}/{dailyGoal}</span>
			</div>
			<div class="progress-bar">
				<div class="progress-fill" style="width: {(completedToday / dailyGoal) * 100}%"></div>
			</div>
			<div class="quick-actions">
				<button class="quick-btn achievements-btn" aria-label="Toggle Achievements" onclick={() => showAchievements = !showAchievements}>
					🏆 Achievements
				</button>
				<button class="quick-btn stats-btn" aria-label="Toggle Stats" onclick={() => showStats = !showStats}>
					📊 Stats
				</button>
			</div>
		</div>

		<nav class="categories enhanced-categories">
			<h3>Categories</h3>
			{#each categories as category}
				<button
					class="category-item enhanced-category"
					class:active={selectedCategory === category.id}
					onclick={() => selectedCategory = category.id}
					aria-label="Select {category.name} Category"
					style="background: {category.gradient}; --category-color: {category.color}"
				>
					<span class="category-icon">{category.icon}</span>
					<div class="category-info">
						<span class="category-name">{category.name}</span>
						<span class="task-count">
							{selectedCategory === 'notes' 
								? notes.filter(n => category.id === 'all' || n.category === category.id).length
								: todos.filter(t => category.id === 'all' || t.category === category.id).length}
						</span>
					</div>
					<div class="category-glow"></div>
				</button>
			{/each}
		</nav>

		<div class="sidebar-footer">
			<button class="disconnect-btn" aria-label="Disconnect Pinecone" onclick={disconnectAPI} disabled={isDisconnecting}>
				{#if isDisconnecting}
					<div class="loading-spinner-small"></div>
					Disconnecting...
				{:else}
					<AnimatedIcon name="disconnect" size={20} rotation={true} />
					Disconnect Pinecone
				{/if}
			</button>
			<button class="logout-btn" aria-label="Sign Out" onclick={logout}>
				<AnimatedIcon name="logout" size={20} bounce={true} />
				Sign Out
			</button>
		</div>
	</aside>

	<!-- Enhanced Main Content -->
	<main class="main-content enhanced-main">
		<header class="content-header enhanced-header">
			<div class="header-left">
				<div class="page-title-container">
					<h1 class="page-title enhanced-title">
						{categories.find(c => c.id === selectedCategory)?.icon}
						{categories.find(c => c.id === selectedCategory)?.name || 'All Items'}
					</h1>
					<div class="title-decoration"></div>
				</div>
				<div class="task-stats enhanced-stats">
					<div class="stat-card">
						<span class="stat-number">{todos.filter(t => !t.completed).length}</span>
						<span class="stat-text">Active Tasks</span>
					</div>
					<div class="stat-card">
						<span class="stat-number">{notes.length}</span>
						<span class="stat-text">Notes</span>
					</div>
					<div class="stat-card">
						<span class="stat-number">{mathFormulas.length}</span>
						<span class="stat-text">Formulas</span>
					</div>
				</div>
			</div>
			
			<div class="header-actions">
				<div class="search-container">
					<input
						type="text"
						placeholder="Search everything..."
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
						aria-label="Switch to List View"
						title="List View"
					>
						<AnimatedIcon name="list" size={16} bounce={true} />
						<span>List</span>
					</button>
					<button
						class="view-btn"
						class:active={currentView === 'board'}
						onclick={() => currentView = 'board'}
						aria-label="Switch to Board View"
						title="Board View"
					>
						<AnimatedIcon name="board" size={16} bounce={true} />
						<span>Board</span>
					</button>
					<button
						class="view-btn"
						class:active={currentView === 'notes'}
						onclick={() => currentView = 'notes'}
						aria-label="Switch to Notes View"
						title="Notes View"
					>
						<AnimatedIcon name="edit" size={16} bounce={true} />
						<span>Notes</span>
					</button>
				</div>

				<button class="create-note-btn" aria-label="Create New Note" onclick={createNewNote}>
					<AnimatedIcon name="add" size={16} rotation={true} />
					<span>New Note</span>
				</button>
			</div>
		</header>

		<!-- Enhanced Add New Task/Note Section -->
		<div class="add-task-container">
			<div class="add-task-form">
				<input
					type="text"
					placeholder="What would you like to accomplish today?"
					bind:value={newTodo}
					class="new-task-input"
					onkeydown={(e) => { if (e.key === 'Enter') addTodo(); }}
				/>
				
				<select bind:value={selectedTodoCategory} class="category-select">
					{#each categories.slice(1) as category}
						<option value={category.id}>{category.icon} {category.name}</option>
					{/each}
				</select>
				
				<button onclick={addTodo} class="add-task-btn" disabled={!newTodo.trim()} aria-label="Add Task">
					<AnimatedIcon name="add" size={20} rotation={true} />
					<span>Add Task</span>
				</button>

				<button onclick={() => showFormulaEditor = !showFormulaEditor} class="formula-btn" aria-label="Toggle Formula Editor">
					<span>∑</span>
					Formula
				</button>
			</div>

			{#if showFormulaEditor}
				<div class="formula-editor">
					<input
						type="text"
						placeholder="Enter LaTeX formula (e.g., E = mc^2, \\frac{a}{b}, \\sqrt{x})"
						bind:value={formulaInput}
						class="formula-input"
						onkeydown={(e) => { if (e.key === 'Enter') addFormula(); }}
					/>
					<button onclick={addFormula} class="add-formula-btn" aria-label="Add Formula">Add Formula</button>
					<button onclick={() => showFormulaEditor = false} class="cancel-btn" aria-label="Cancel Formula Editor">Cancel</button>
				</div>
			{/if}
		</div>

		<!-- Enhanced Content Display -->
		<div class="content-container">
			{#if currentView === 'notes'}
				<div class="notes-grid">
					{#each notes as note (note.id)}
						<div class="note-card" style="background-color: {note.backgroundColor}">
							<div class="note-header">
								<h3 class="note-title" style="color: {note.fontColor}; font-family: {note.fontFamily}; font-size: {note.fontSize}px; font-weight: {note.fontWeight}">
									{note.title}
								</h3>
								<div class="note-actions">
									<button onclick={() => editNote(note)} class="edit-note-btn" aria-label="Edit Note">
										<AnimatedIcon name="edit" size={14} />
									</button>
									<button onclick={() => deleteNote(note.id)} class="delete-note-btn" aria-label="Delete Note">
										<AnimatedIcon name="delete" size={14} />
									</button>
								</div>
							</div>
							<div class="note-content" style="color: {note.fontColor}; font-family: {note.fontFamily}; font-size: {note.fontSize - 2}px; font-weight: {note.fontWeight}">
								{@html note.content.replace(/\$\$(.*?)\$\$/g, '<span class="math-formula">$1</span>')}
							</div>
							<div class="note-meta">
								<span class="note-date">{new Date(note.updatedAt).toLocaleDateString()}</span>
								{#if note.tags && note.tags.length > 0}
									<div class="note-tags">
										{#each note.tags as tag}
											<span class="tag">{tag}</span>
										{/each}
									</div>
								{/if}
							</div>
						</div>
					{/each}
					
					{#if notes.length === 0}
						<div class="empty-state">
							<div class="empty-icon">📝</div>
							<h3>No notes yet</h3>
							<p>Create your first note to get started!</p>
							<button onclick={createNewNote} class="create-first-note-btn" aria-label="Create First Note">
								Create Note
							</button>
						</div>
					{/if}
				</div>
			{:else if currentView === 'board'}
				<BoardView
					todos={todos.filter(item => item.text)}
					categories={categories}
					onUpdateTodo={updateTodo}
					onDeleteTodo={deleteTodo}
				/>
			{:else}
				<div class="tasks-list">
					{#each todos as item (item.id)}
						<div class="task-item" class:completed={item.completed}>
							<div class="task-checkbox-container">
								<button
									class="task-checkbox"
									onclick={() => toggleTodo(item.id)}
									class:checked={item.completed}
									aria-label="Toggle Task Completion"
								>
									{#if item.completed}✓{/if}
								</button>
							</div>
							<div class="task-content">
								<div class="task-text">{item.text}</div>
								<div class="task-meta">
									<span class="task-category">
										{categories.find(c => c.id === item.category)?.name}
									</span>
								</div>
							</div>
							<div class="task-actions">
								<button onclick={() => deleteTodo(item.id)} class="action-btn delete" aria-label="Delete Task">
									<AnimatedIcon name="delete" size={16} />
								</button>
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</div>
	</main>

	<!-- Enhanced Note Editor Modal -->
	{#if showNoteEditor}
		<!-- Fixed modal accessibility by using proper event handling -->
		<div class="modal-overlay" role="dialog" aria-modal="true" tabindex="0" onkeydown={(e) => { if (e.key === 'Escape') cancelNoteEdit(); }} onclick={handleModalOverlayClick}>
			<div class="note-editor-modal" role="document">
				<div class="editor-header">
					<input
						type="text"
						bind:value={currentNote.title}
						class="note-title-input"
						placeholder="Note title..."
					/>
					<div class="editor-actions">
						<button onclick={saveNote} class="save-btn" aria-label="Save Note">Save</button>
						<button onclick={cancelNoteEdit} class="cancel-btn" aria-label="Cancel Note Edit">Cancel</button>
					</div>
				</div>

				<div class="formatting-toolbar">
					<div class="format-group">
						<select bind:value={selectedFont} onchange={() => currentNote.fontFamily = selectedFont}>
							{#each fontOptions as font}
								<option value={font.name}>{font.name}</option>
							{/each}
						</select>
						
						<input
							type="range"
							min="12"
							max="24"
							bind:value={selectedFontSize}
							onchange={() => currentNote.fontSize = selectedFontSize}
							class="font-size-slider"
						/>
						<span class="font-size-display">{selectedFontSize}px</span>
						
						<input
							type="color"
							bind:value={selectedFontColor}
							onchange={() => currentNote.fontColor = selectedFontColor}
							class="color-picker"
						/>
						
						<select bind:value={selectedFontWeight} onchange={() => currentNote.fontWeight = selectedFontWeight}>
							<option value={300}>Light</option>
							<option value={400}>Normal</option>
							<option value={500}>Medium</option>
							<option value={600}>Semi Bold</option>
							<option value={700}>Bold</option>
						</select>
					</div>

					<div class="format-group">
						<button onclick={() => applyFormatting('bold')} class="format-btn" aria-label="Bold Text">B</button>
						<button onclick={() => applyFormatting('italic')} class="format-btn" aria-label="Italic Text">I</button>
						<button onclick={() => applyFormatting('underline')} class="format-btn" aria-label="Underline Text">U</button>
					</div>

					<div class="format-group">
						<button onclick={() => applyFormatting('heading1')} class="format-btn" aria-label="Heading 1">H1</button>
						<button onclick={() => applyFormatting('heading2')} class="format-btn" aria-label="Heading 2">H2</button>
						<button onclick={() => applyFormatting('heading3')} class="format-btn" aria-label="Heading 3">H3</button>
					</div>

					<div class="format-group">
						<button onclick={() => insertElement('bullet')} class="format-btn" aria-label="Insert Bullet Point">•</button>
						<button onclick={() => insertElement('number')} class="format-btn" aria-label="Insert Numbered Item">1.</button>
						<button onclick={() => insertElement('checkbox')} class="format-btn" aria-label="Insert Checkbox">☐</button>
						<button onclick={() => insertElement('radio')} class="format-btn" aria-label="Insert Radio Button">○</button>
					</div>

					<div class="format-group">
						<button onclick={() => insertElement('paragraph')} class="format-btn" aria-label="Insert Paragraph">¶</button>
						<button onclick={() => showFormulaEditor = true} class="format-btn" aria-label="Insert Formula">∑</button>
					</div>
				</div>

				<textarea
					bind:value={currentNote.content}
					class="note-content-editor"
					placeholder="Start writing your note..."
					style="font-family: {currentNote.fontFamily}; font-size: {currentNote.fontSize}px; color: {currentNote.fontColor}; font-weight: {currentNote.fontWeight}"
				></textarea>

				{#if showFormulaEditor}
					<div class="formula-editor-inline">
						<input
							type="text"
							placeholder="Enter LaTeX formula"
							bind:value={formulaInput}
							class="formula-input-inline"
						/>
						<button onclick={addFormula} class="add-formula-btn-inline" aria-label="Insert Formula">Insert</button>
						<button onclick={() => showFormulaEditor = false} class="cancel-formula-btn" aria-label="Cancel Formula Editor">Cancel</button>
					</div>
				{/if}

				<div class="editor-footer">
					<div class="note-stats">
						Words: {currentNote.content.split(' ').filter(w => w.length > 0).length} | 
						Characters: {currentNote.content.length}
					</div>
				</div>
			</div>
		</div>
	{/if}

	<!-- Added achievements modal -->
	{#if showAchievements}
		<div class="modal-overlay" role="dialog" aria-modal="true" tabindex="0" onkeydown={(e) => { if (e.key === 'Escape') showAchievements = false; }} onclick={handleAchievementsModalClick}>
			<div class="achievements-modal" role="document" onclick={(e) => e.stopPropagation()}>
				<div class="modal-header">
					<h2>🏆 Achievements</h2>
					<button class="close-btn" onclick={() => showAchievements = false} aria-label="Close Achievements Modal">×</button>
				</div>
				<div class="achievements-grid">
					{#each achievements as achievement}
						<div class="achievement-card" class:unlocked={achievement.unlocked}>
							<div class="achievement-icon">{achievement.icon}</div>
							<h3>{achievement.name}</h3>
							<p>{achievement.description}</p>
							{#if achievement.unlocked}
								<div class="unlocked-badge">Unlocked!</div>
							{:else}
								<div class="locked-badge">Locked</div>
							{/if}
						</div>
					{/each}
				</div>
			</div>
		</div>
	{/if}

	<FloatingActionButton onclick={createNewNote} aria-label="Create New Note" />
</div>

<style>
	/* ... existing styles ... */

	/* Enhanced sidebar styling with vibrant colors */
	.enhanced-sidebar {
		background: linear-gradient(180deg, #667eea 0%, #764ba2 100%);
		color: white;
		box-shadow: 0 0 30px rgba(102, 126, 234, 0.3);
	}

	.sidebar-header {
		padding: 2rem 1.5rem;
		text-align: center;
		border-bottom: 1px solid rgba(255, 255, 255, 0.2);
	}

	.user-avatar {
		position: relative;
		display: inline-block;
		margin-bottom: 1rem;
	}

	.avatar-ring {
		width: 80px;
		height: 80px;
		border-radius: 50%;
		background: linear-gradient(45deg, #f093fb 0%, #f5576c 100%);
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 2rem;
		animation: pulse 2s infinite;
	}

	.level-badge {
		position: absolute;
		top: -5px;
		right: -5px;
		background: linear-gradient(45deg, #ffecd2 0%, #fcb69f 100%);
		color: #333;
		padding: 0.25rem 0.5rem;
		border-radius: 12px;
		font-size: 0.75rem;
		font-weight: bold;
	}

	.user-info {
		text-align: center;
	}

	.user-name {
		margin: 0 0 0.5rem 0;
		font-size: 1.25rem;
		font-weight: 600;
	}

	.user-stats {
		display: flex;
		justify-content: center;
		gap: 1rem;
	}

	.stat-item {
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	.stat-value {
		font-size: 1.5rem;
		font-weight: bold;
		color: #fbbf24;
	}

	.stat-label {
		font-size: 0.75rem;
		opacity: 0.8;
	}

	.daily-progress {
		padding: 1.5rem;
		margin: 1rem;
		background: rgba(255, 255, 255, 0.1);
		border-radius: 16px;
		backdrop-filter: blur(10px);
	}

	.progress-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1rem;
	}

	.progress-header h3 {
		margin: 0;
		font-size: 1rem;
	}

	.progress-text {
		font-weight: bold;
		color: #fbbf24;
	}

	.progress-bar {
		height: 8px;
		background: rgba(255, 255, 255, 0.2);
		border-radius: 4px;
		overflow: hidden;
		margin-bottom: 1rem;
	}

	.progress-fill {
		height: 100%;
		background: linear-gradient(90deg, #10b981 0%, #34d399 100%);
		border-radius: 4px;
		transition: width 0.3s ease;
	}

	.quick-actions {
		display: flex;
		gap: 0.5rem;
	}

	.quick-btn {
		flex: 1;
		padding: 0.5rem;
		border: none;
		border-radius: 8px;
		background: rgba(255, 255, 255, 0.2);
		color: white;
		cursor: pointer;
		font-size: 0.875rem;
		transition: all 0.3s ease;
	}

	.quick-btn:hover {
		background: rgba(255, 255, 255, 0.3);
		transform: translateY(-2px);
	}

	.enhanced-categories {
		padding: 1rem;
	}

	.enhanced-category {
		position: relative;
		width: 100%;
		padding: 1rem;
		margin-bottom: 0.5rem;
		border: none;
		border-radius: 12px;
		color: white;
		cursor: pointer;
		transition: all 0.3s ease;
		overflow: hidden;
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	.enhanced-category:hover {
		transform: translateX(5px) scale(1.02);
		box-shadow: 0 8px 25px rgba(0, 0, 0, 0.2);
	}

	.enhanced-category.active {
		transform: translateX(10px) scale(1.05);
		box-shadow: 0 12px 30px rgba(0, 0, 0, 0.3);
	}

	.category-glow {
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: linear-gradient(45deg, rgba(255, 255, 255, 0.1), transparent);
		opacity: 0;
		transition: opacity 0.3s ease;
	}

	.enhanced-category:hover .category-glow {
		opacity: 1;
	}

	.category-info {
		flex: 1;
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.task-count {
		background: rgba(255, 255, 255, 0.3);
		padding: 0.25rem 0.75rem;
		border-radius: 12px;
		font-size: 0.875rem;
		font-weight: bold;
	}

	.enhanced-main {
		background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
		min-height: 100vh;
	}

	.enhanced-header {
		background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
		color: white;
		padding: 2rem;
		border-radius: 0 0 24px 24px;
		margin-bottom: 2rem;
		box-shadow: 0 8px 32px rgba(102, 126, 234, 0.3);
	}

	.page-title-container {
		position: relative;
		margin-bottom: 1rem;
	}

	.enhanced-title {
		font-size: 2.5rem;
		font-weight: 700;
		margin: 0;
		text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
	}

	.title-decoration {
		height: 4px;
		width: 100px;
		background: linear-gradient(90deg, #fbbf24 0%, #f59e0b 100%);
		border-radius: 2px;
		margin-top: 0.5rem;
	}

	.enhanced-stats {
		display: flex;
		gap: 1.5rem;
	}

	.stat-card {
		background: rgba(255, 255, 255, 0.2);
		padding: 1rem 1.5rem;
		border-radius: 12px;
		backdrop-filter: blur(10px);
		display: flex;
		flex-direction: column;
		align-items: center;
		transition: all 0.3s ease;
	}

	.stat-card:hover {
		transform: translateY(-3px);
		background: rgba(255, 255, 255, 0.3);
	}

	.stat-number {
		font-size: 2rem;
		font-weight: bold;
		color: #fbbf24;
	}

	.stat-text {
		font-size: 0.875rem;
		opacity: 0.9;
	}

	.achievements-modal {
		background: white;
		border-radius: 20px;
		padding: 2rem;
		max-width: 600px;
		width: 90vw;
		max-height: 80vh;
		overflow-y: auto;
	}

	.modal-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 2rem;
		padding-bottom: 1rem;
		border-bottom: 2px solid #f3f4f6;
	}

	.modal-header h2 {
		margin: 0;
		font-size: 1.75rem;
		background: linear-gradient(45deg, #667eea, #764ba2);
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
	}

	.close-btn {
		background: none;
		border: none;
		font-size: 2rem;
		cursor: pointer;
		color: #6b7280;
	}

	.achievements-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
		gap: 1.5rem;
	}

	.achievement-card {
		padding: 1.5rem;
		border-radius: 16px;
		text-align: center;
		transition: all 0.3s ease;
		position: relative;
		overflow: hidden;
	}

	.achievement-card.unlocked {
		background: linear-gradient(135deg, #10b981 0%, #34d399 100%);
		color: white;
		transform: scale(1.02);
		box-shadow: 0 8px 25px rgba(16, 185, 129, 0.3);
	}

	.achievement-card:not(.unlocked) {
		background: #f3f4f6;
		color: #6b7280;
	}

	.achievement-icon {
		font-size: 3rem;
		margin-bottom: 1rem;
	}

	.achievement-card h3 {
		margin: 0 0 0.5rem 0;
		font-size: 1.25rem;
	}

	.achievement-card p {
		margin: 0 0 1rem 0;
		opacity: 0.9;
	}

	.unlocked-badge,
	.locked-badge {
		padding: 0.25rem 0.75rem;
		border-radius: 12px;
		font-size: 0.875rem;
		font-weight: bold;
	}

	.unlocked-badge {
		background: rgba(255, 255, 255, 0.3);
		color: white;
	}

	.locked-badge {
		background: #e5e7eb;
		color: #6b7280;
	}

	@keyframes pulse {
		0%, 100% { transform: scale(1); }
		50% { transform: scale(1.05); }
	}

	/* Enhanced styles for note-taking features */
	.notes-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
		gap: 1.5rem;
		padding: 1.5rem;
	}

	.note-card {
		background: white;
		border-radius: 12px;
		padding: 1.5rem;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
		transition: all 0.3s ease;
		border: 1px solid #e5e7eb;
	}

	.note-card:hover {
		transform: translateY(-2px);
		box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
	}

	.note-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		margin-bottom: 1rem;
	}

	.note-title {
		margin: 0;
		font-size: 1.25rem;
		font-weight: 600;
		line-height: 1.3;
		flex: 1;
	}

	.note-actions {
		display: flex;
		gap: 0.5rem;
		opacity: 0;
		transition: opacity 0.2s ease;
	}

	.note-card:hover .note-actions {
		opacity: 1;
	}

	.edit-note-btn,
	.delete-note-btn {
		padding: 0.25rem;
		border: none;
		background: none;
		cursor: pointer;
		border-radius: 4px;
		transition: background-color 0.2s ease;
	}

	.edit-note-btn:hover {
		background-color: #f3f4f6;
	}

	.delete-note-btn:hover {
		background-color: #fee2e2;
		color: #dc2626;
	}

	.note-content {
		line-height: 1.6;
		margin-bottom: 1rem;
		max-height: 150px;
		overflow: hidden;
	}

	.note-meta {
		display: flex;
		justify-content: space-between;
		align-items: center;
		font-size: 0.875rem;
		color: #6b7280;
	}

	.note-tags {
		display: flex;
		gap: 0.5rem;
	}

	.tag {
		background: #f3f4f6;
		padding: 0.25rem 0.5rem;
		border-radius: 12px;
		font-size: 0.75rem;
	}

	.modal-overlay {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: rgba(0, 0, 0, 0.5);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1000;
		backdrop-filter: blur(4px);
	}

	.note-editor-modal {
		background: white;
		border-radius: 16px;
		width: 90vw;
		max-width: 800px;
		height: 80vh;
		display: flex;
		flex-direction: column;
		box-shadow: 0 25px 50px rgba(0, 0, 0, 0.25);
	}

	.editor-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1.5rem;
		border-bottom: 1px solid #e5e7eb;
	}

	.note-title-input {
		flex: 1;
		border: none;
		font-size: 1.5rem;
		font-weight: 600;
		outline: none;
		margin-right: 1rem;
	}

	.editor-actions {
		display: flex;
		gap: 0.75rem;
	}

	.save-btn,
	.cancel-btn {
		padding: 0.5rem 1rem;
		border: none;
		border-radius: 8px;
		cursor: pointer;
		font-weight: 500;
		transition: all 0.2s ease;
	}

	.save-btn {
		background: #3b82f6;
		color: white;
	}

	.save-btn:hover {
		background: #2563eb;
	}

	.cancel-btn {
		background: #f3f4f6;
		color: #374151;
	}

	.cancel-btn:hover {
		background: #e5e7eb;
	}

	.formatting-toolbar {
		display: flex;
		gap: 1rem;
		padding: 1rem 1.5rem;
		border-bottom: 1px solid #e5e7eb;
		flex-wrap: wrap;
		background: #f9fafb;
	}

	.format-group {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.format-btn {
		padding: 0.5rem;
		border: 1px solid #d1d5db;
		background: white;
		border-radius: 6px;
		cursor: pointer;
		transition: all 0.2s ease;
		min-width: 32px;
		height: 32px;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.format-btn:hover {
		background: #f3f4f6;
		border-color: #9ca3af;
	}

	.font-size-slider {
		width: 80px;
	}

	.font-size-display {
		font-size: 0.875rem;
		color: #6b7280;
		min-width: 35px;
	}

	.color-picker {
		width: 32px;
		height: 32px;
		border: none;
		border-radius: 6px;
		cursor: pointer;
	}

	.note-content-editor {
		flex: 1;
		padding: 1.5rem;
		border: none;
		outline: none;
		resize: none;
		line-height: 1.6;
		font-family: inherit;
	}

	.formula-editor,
	.formula-editor-inline {
		display: flex;
		gap: 0.75rem;
		padding: 1rem 1.5rem;
		background: #f9fafb;
		border-top: 1px solid #e5e7eb;
		align-items: center;
	}

	.formula-input,
	.formula-input-inline {
		flex: 1;
		padding: 0.5rem;
		border: 1px solid #d1d5db;
		border-radius: 6px;
		font-family: 'Courier New', monospace;
	}

	.add-formula-btn,
	.add-formula-btn-inline {
		padding: 0.5rem 1rem;
		background: #10b981;
		color: white;
		border: none;
		border-radius: 6px;
		cursor: pointer;
		font-weight: 500;
	}

	.add-formula-btn:hover,
	.add-formula-btn-inline:hover {
		background: #059669;
	}

	.cancel-formula-btn {
		padding: 0.5rem 1rem;
		background: #f3f4f6;
		color: #374151;
		border: none;
		border-radius: 6px;
		cursor: pointer;
	}

	.editor-footer {
		padding: 1rem 1.5rem;
		border-top: 1px solid #e5e7eb;
		background: #f9fafb;
	}

	.note-stats {
		font-size: 0.875rem;
		color: #6b7280;
	}

	.create-note-btn {
		background: #8b5cf6;
		color: white;
		border: none;
		padding: 0.5rem 1rem;
		border-radius: 8px;
		cursor: pointer;
		font-weight: 500;
		display: flex;
		align-items: center;
		gap: 0.5rem;
		transition: all 0.2s ease;
	}

	.create-note-btn:hover {
		background: #7c3aed;
	}

	.create-first-note-btn {
		background: #3b82f6;
		color: white;
		border: none;
		padding: 0.75rem 1.5rem;
		border-radius: 8px;
		cursor: pointer;
		font-weight: 500;
		margin-top: 1rem;
	}

	.create-first-note-btn:hover {
		background: #2563eb;
	}

	.empty-state {
		text-align: center;
		padding: 3rem;
		color: #6b7280;
	}

	.empty-icon {
		font-size: 3rem;
		margin-bottom: 1rem;
	}
</style>
