<script>
	import { onMount } from 'svelte';

	let { value = '', placeholder = 'Start typing...', onUpdate = () => {} } = $props();
	
	let editor;
	let isFormatting = $state(false);
	let selectedFormat = $state('');

	// Format commands
	const formatCommands = {
		bold: () => document.execCommand('bold'),
		italic: () => document.execCommand('italic'),
		underline: () => document.execCommand('underline'),
		strikethrough: () => document.execCommand('strikeThrough'),
		h1: () => document.execCommand('formatBlock', false, 'h1'),
		h2: () => document.execCommand('formatBlock', false, 'h2'),
		h3: () => document.execCommand('formatBlock', false, 'h3'),
		p: () => document.execCommand('formatBlock', false, 'p'),
		ul: () => document.execCommand('insertUnorderedList'),
		ol: () => document.execCommand('insertOrderedList'),
		quote: () => document.execCommand('formatBlock', false, 'blockquote'),
		code: () => document.execCommand('formatBlock', false, 'pre')
	};

	function handleFormat(command) {
		isFormatting = true;
		formatCommands[command]();
		editor.focus();
		setTimeout(() => {
			isFormatting = false;
			handleInput();
		}, 10);
	}

	function handleInput() {
		if (!isFormatting) {
			onUpdate(editor.innerHTML);
		}
	}

	function handleKeydown(event) {
		// Handle keyboard shortcuts
		if (event.ctrlKey || event.metaKey) {
			switch (event.key) {
				case 'b':
					event.preventDefault();
					handleFormat('bold');
					break;
				case 'i':
					event.preventDefault();
					handleFormat('italic');
					break;
				case 'u':
					event.preventDefault();
					handleFormat('underline');
					break;
			}
		}

		// Handle Enter key for better list formatting
		if (event.key === 'Enter' && !event.shiftKey) {
			const selection = window.getSelection();
			const range = selection.getRangeAt(0);
			const parentElement = range.commonAncestorContainer.parentElement;
			
			if (parentElement.tagName === 'LI') {
				const listItem = parentElement;
				const list = listItem.parentElement;
				
				if (listItem.textContent.trim() === '') {
					event.preventDefault();
					document.execCommand('formatBlock', false, 'p');
				}
			}
		}
	}

	onMount(() => {
		if (value) {
			editor.innerHTML = value;
		}
	});
</script>

<div class="rich-editor-container">
	<!-- Toolbar -->
	<div class="toolbar">
		<div class="toolbar-group">
			<button 
				type="button"
				class="toolbar-btn"
				onclick={() => handleFormat('bold')}
				title="Bold (Ctrl+B)"
			>
				<strong>B</strong>
			</button>
			<button 
				type="button"
				class="toolbar-btn"
				onclick={() => handleFormat('italic')}
				title="Italic (Ctrl+I)"
			>
				<em>I</em>
			</button>
			<button 
				type="button"
				class="toolbar-btn"
				onclick={() => handleFormat('underline')}
				title="Underline (Ctrl+U)"
			>
				<u>U</u>
			</button>
			<button 
				type="button"
				class="toolbar-btn"
				onclick={() => handleFormat('strikethrough')}
				title="Strikethrough"
			>
				<s>S</s>
			</button>
		</div>

		<div class="toolbar-separator"></div>

		<div class="toolbar-group">
			<button 
				type="button"
				class="toolbar-btn"
				onclick={() => handleFormat('h1')}
				title="Heading 1"
			>
				H1
			</button>
			<button 
				type="button"
				class="toolbar-btn"
				onclick={() => handleFormat('h2')}
				title="Heading 2"
			>
				H2
			</button>
			<button 
				type="button"
				class="toolbar-btn"
				onclick={() => handleFormat('h3')}
				title="Heading 3"
			>
				H3
			</button>
			<button 
				type="button"
				class="toolbar-btn"
				onclick={() => handleFormat('p')}
				title="Paragraph"
			>
				P
			</button>
		</div>

		<div class="toolbar-separator"></div>

		<div class="toolbar-group">
			<button 
				type="button"
				class="toolbar-btn"
				onclick={() => handleFormat('ul')}
				title="Bullet List"
			>
				• List
			</button>
			<button 
				type="button"
				class="toolbar-btn"
				onclick={() => handleFormat('ol')}
				title="Numbered List"
			>
				1. List
			</button>
			<button 
				type="button"
				class="toolbar-btn"
				onclick={() => handleFormat('quote')}
				title="Quote"
			>
				❝ Quote
			</button>
			<button 
				type="button"
				class="toolbar-btn"
				onclick={() => handleFormat('code')}
				title="Code Block"
			>
				&lt;&gt; Code
			</button>
		</div>
	</div>

	<!-- Editor -->
	<div 
		bind:this={editor}
		class="rich-editor"
		contenteditable="true"
		data-placeholder={placeholder}
		oninput={handleInput}
		onkeydown={handleKeydown}
		role="textbox"
		aria-multiline="true"
		tabindex="0"
	></div>
</div>

<style>
	.rich-editor-container {
		border: 2px solid var(--border, #e2e8f0);
		border-radius: 12px;
		background: var(--surface, white);
		overflow: hidden;
		transition: border-color 0.2s ease;
	}

	.rich-editor-container:focus-within {
		border-color: var(--primary, #667eea);
		box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
	}

	.toolbar {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.75rem;
		background: var(--background, #f8fafc);
		border-bottom: 1px solid var(--border, #e2e8f0);
		flex-wrap: wrap;
	}

	.toolbar-group {
		display: flex;
		gap: 0.25rem;
	}

	.toolbar-separator {
		width: 1px;
		height: 20px;
		background: var(--border, #e2e8f0);
		margin: 0 0.25rem;
	}

	.toolbar-btn {
		padding: 0.375rem 0.5rem;
		border: 1px solid transparent;
		border-radius: 6px;
		background: none;
		color: var(--text, #2d3748);
		cursor: pointer;
		font-size: 0.75rem;
		font-weight: 500;
		transition: all 0.2s ease;
		min-width: 32px;
		height: 32px;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.toolbar-btn:hover {
		background: var(--surface, white);
		border-color: var(--border, #e2e8f0);
	}

	.toolbar-btn:active {
		background: var(--primary, #667eea);
		color: white;
		border-color: var(--primary, #667eea);
	}

	.rich-editor {
		min-height: 120px;
		max-height: 300px;
		padding: 1rem;
		outline: none;
		overflow-y: auto;
		line-height: 1.6;
		color: var(--text, #2d3748);
		font-family: inherit;
	}

	.rich-editor:empty::before {
		content: attr(data-placeholder);
		color: var(--text-muted, #718096);
		pointer-events: none;
	}

	/* Rich text styles */
	.rich-editor :global(h1) {
		font-size: 1.875rem;
		font-weight: 700;
		margin: 0.5rem 0;
		color: var(--text, #2d3748);
	}

	.rich-editor :global(h2) {
		font-size: 1.5rem;
		font-weight: 600;
		margin: 0.5rem 0;
		color: var(--text, #2d3748);
	}

	.rich-editor :global(h3) {
		font-size: 1.25rem;
		font-weight: 600;
		margin: 0.5rem 0;
		color: var(--text, #2d3748);
	}

	.rich-editor :global(p) {
		margin: 0.5rem 0;
	}

	.rich-editor :global(ul),
	.rich-editor :global(ol) {
		margin: 0.5rem 0;
		padding-left: 1.5rem;
	}

	.rich-editor :global(li) {
		margin: 0.25rem 0;
	}

	.rich-editor :global(blockquote) {
		border-left: 4px solid var(--primary, #667eea);
		padding-left: 1rem;
		margin: 0.5rem 0;
		font-style: italic;
		color: var(--text-muted, #718096);
	}

	.rich-editor :global(pre) {
		background: var(--background, #f8fafc);
		border-radius: 6px;
		padding: 0.75rem;
		margin: 0.5rem 0;
		overflow-x: auto;
		font-family: 'Fira Code', 'Monaco', 'Menlo', monospace;
		font-size: 0.875rem;
		border: 1px solid var(--border, #e2e8f0);
	}

	.rich-editor :global(strong) {
		font-weight: 600;
	}

	.rich-editor :global(em) {
		font-style: italic;
	}

	.rich-editor :global(u) {
		text-decoration: underline;
	}

	.rich-editor :global(s) {
		text-decoration: line-through;
	}

	/* Responsive */
	@media (max-width: 768px) {
		.toolbar {
			padding: 0.5rem;
		}
		
		.toolbar-btn {
			min-width: 28px;
			height: 28px;
			font-size: 0.7rem;
		}
		
		.rich-editor {
			padding: 0.75rem;
			min-height: 100px;
		}
	}
</style>
