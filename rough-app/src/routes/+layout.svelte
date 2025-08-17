<script>
	import { onMount } from 'svelte';
	
	let { children } = $props();
	let mounted = $state(false);

	onMount(() => {
		// Add CSS custom properties for better performance
		const root = document.documentElement;
		root.style.setProperty('--vh', `${window.innerHeight * 0.01}px`);
		
		// Handle viewport height changes for mobile
		const handleResize = () => {
			root.style.setProperty('--vh', `${window.innerHeight * 0.01}px`);
		};
		
		window.addEventListener('resize', handleResize);
		mounted = true;
		
		return () => {
			window.removeEventListener('resize', handleResize);
		};
	});
</script>

<svelte:head>
	<title>TaskFlow - Beautiful Todo & Task Management</title>
	<meta name="description" content="A beautiful, Notion-like task management application built with SvelteKit" />
	<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
	
	<!-- Preload critical resources -->
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
	
	<!-- Optimize font loading -->
	<link 
		href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" 
		rel="stylesheet"
		media="print"
		onload="this.media='all'"
	/>
	
	<!-- Favicon -->
	<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>📝</text></svg>" />

	<!-- PWA Manifest -->
	<link rel="manifest" href="/manifest.json" />
	<meta name="theme-color" content="#667eea" />
</svelte:head>

{#if mounted}
	{@render children()}
{:else}
	<!-- Loading state for better perceived performance -->
	<div class="loading-screen">
		<div class="loading-spinner"></div>
		<p>Loading TaskFlow...</p>
	</div>
{/if}

<style>
	/* CSS Reset and base styles */
	:global(*),
	:global(*::before),
	:global(*::after) {
		box-sizing: border-box;
		margin: 0;
		padding: 0;
	}

	:global(html) {
		height: 100%;
		font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 
			'Helvetica Neue', Arial, sans-serif;
		line-height: 1.6;
		-webkit-font-smoothing: antialiased;
		-moz-osx-font-smoothing: grayscale;
		text-rendering: optimizeLegibility;
	}

	:global(body) {
		height: 100%;
		margin: 0;
		background: #f8fafc;
		color: #2d3748;
		overflow-x: hidden;
		/* Use CSS custom property for better mobile viewport handling */
		min-height: calc(var(--vh, 1vh) * 100);
	}

	/* Performance optimizations */
	:global(img) {
		max-width: 100%;
		height: auto;
		/* Improve image loading performance */
		loading: lazy;
		decode: async;
	}

	/* Focus management for accessibility */
	:global(:focus-visible) {
		outline: 2px solid #667eea;
		outline-offset: 2px;
		border-radius: 4px;
	}

	/* Hide focus outline for mouse users */
	:global(:focus:not(:focus-visible)) {
		outline: none;
	}

	/* Improve button and interactive element performance */
	:global(button),
	:global(input),
	:global(select),
	:global(textarea) {
		font-family: inherit;
		border: none;
		background: none;
		/* Improve touch targets on mobile */
		min-height: 44px;
	}

	/* Smooth scrolling */
	:global(html) {
		scroll-behavior: smooth;
	}

	/* Reduce motion for users who prefer it */
	@media (prefers-reduced-motion: reduce) {
		:global(*),
		:global(*::before),
		:global(*::after) {
			animation-duration: 0.01ms !important;
			animation-iteration-count: 1 !important;
			transition-duration: 0.01ms !important;
		}
		
		:global(html) {
			scroll-behavior: auto;
		}
	}

	/* Dark mode support */
	@media (prefers-color-scheme: dark) {
		:global(body) {
			background: #1a202c;
			color: #e2e8f0;
		}
	}

	/* Loading screen styles */
	.loading-screen {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		height: 100vh;
		background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
		color: white;
		text-align: center;
	}

	.loading-spinner {
		width: 40px;
		height: 40px;
		border: 3px solid rgba(255, 255, 255, 0.3);
		border-top: 3px solid white;
		border-radius: 50%;
		animation: spin 1s linear infinite;
		margin-bottom: 1rem;
	}

	.loading-screen p {
		font-size: 1.1rem;
		font-weight: 500;
		opacity: 0.9;
	}

	@keyframes spin {
		0% { transform: rotate(0deg); }
		100% { transform: rotate(360deg); }
	}

	/* Print styles */
	@media print {
		:global(body) {
			background: white;
			color: black;
		}
		
		:global(.sidebar),
		:global(.header-actions),
		:global(.task-actions) {
			display: none !important;
		}
	}

	/* High contrast mode support */
	@media (prefers-contrast: high) {
		:global(body) {
			background: white;
			color: black;
		}
		
		:global(button),
		:global(input) {
			border: 2px solid black;
		}
	}

	/* Performance: Contain layout shifts */
	:global(.task-item),
	:global(.category-item),
	:global(.feature-item) {
		contain: layout style paint;
	}

	/* Optimize animations for 60fps */
	:global(.task-item),
	:global(.floating-card),
	:global(button) {
		will-change: transform;
		transform: translateZ(0);
		backface-visibility: hidden;
	}

	/* Remove will-change after animation completes to save memory */
	:global(.task-item:not(:hover)),
	:global(button:not(:hover)) {
		will-change: auto;
	}
</style>
