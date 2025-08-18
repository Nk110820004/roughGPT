<script>
	import { onMount } from 'svelte';
	import * as anime from 'animejs';
	import AnimatedIcon from './AnimatedIcon.svelte';

	let { onclick, icon = 'add', size = 56, color = '#6366f1' } = $props();
	
	let fabElement;
	let isVisible = $state(true);
	let lastScrollY = 0;

	function handleScroll() {
		const currentScrollY = window.scrollY;
		
		if (currentScrollY > lastScrollY && currentScrollY > 100) {
			// Scrolling down - hide FAB
			isVisible = false;
			anime({
				targets: fabElement,
				scale: 0,
				opacity: 0,
				duration: 300,
				easing: 'easeOutQuad'
			});
		} else if (currentScrollY < lastScrollY) {
			// Scrolling up - show FAB
			isVisible = true;
			anime({
				targets: fabElement,
				scale: 1,
				opacity: 1,
				duration: 300,
				easing: 'easeOutBack'
			});
		}
		
		lastScrollY = currentScrollY;
	}

	function handleClick() {
		// Ripple effect
		anime({
			targets: fabElement,
			scale: [1, 1.1, 1],
			duration: 200,
			easing: 'easeOutQuad'
		});

		// Create ripple element
		const ripple = document.createElement('div');
		ripple.classList.add('fab-ripple');
		fabElement.appendChild(ripple);

		anime({
			targets: ripple,
			scale: [0, 4],
			opacity: [0.5, 0],
			duration: 600,
			easing: 'easeOutQuad',
			complete: () => ripple.remove()
		});

		if (onclick) onclick();
	}

	onMount(() => {
		window.addEventListener('scroll', handleScroll, { passive: true });
		
		// Entry animation
		anime({
			targets: fabElement,
			scale: [0, 1],
			opacity: [0, 1],
			duration: 500,
			delay: 1000,
			easing: 'easeOutBack'
		});

		// Breathing animation
		anime({
			targets: fabElement,
			scale: [1, 1.05, 1],
			duration: 2000,
			loop: true,
			easing: 'easeInOutSine'
		});

		return () => {
			window.removeEventListener('scroll', handleScroll);
		};
	});
</script>

<button
	bind:this={fabElement}
	class="floating-action-button"
	onclick={handleClick}
	style="--fab-size: {size}px; --fab-color: {color};"
	aria-label="Quick add task"
>
	<AnimatedIcon name={icon} size={size * 0.4} color="white" rotation={true} />
</button>

<style>
	.floating-action-button {
		position: fixed;
		bottom: 2rem;
		right: 2rem;
		width: var(--fab-size);
		height: var(--fab-size);
		border-radius: 50%;
		background: linear-gradient(135deg, var(--fab-color), rgba(99, 102, 241, 0.8));
		border: none;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		box-shadow: 0 8px 24px rgba(99, 102, 241, 0.3);
		z-index: 1000;
		transition: all 0.3s ease;
		overflow: hidden;
		position: relative;
	}

	.floating-action-button:hover {
		transform: translateY(-2px);
		box-shadow: 0 12px 32px rgba(99, 102, 241, 0.4);
		background: linear-gradient(135deg, #7c3aed, var(--fab-color));
	}

	.floating-action-button:active {
		transform: translateY(0);
	}

	:global(.fab-ripple) {
		position: absolute;
		top: 50%;
		left: 50%;
		width: 10px;
		height: 10px;
		border-radius: 50%;
		background: rgba(255, 255, 255, 0.3);
		transform: translate(-50%, -50%);
		pointer-events: none;
	}

	/* Mobile responsiveness */
	@media (max-width: 768px) {
		.floating-action-button {
			bottom: 1rem;
			right: 1rem;
		}
	}
</style>
