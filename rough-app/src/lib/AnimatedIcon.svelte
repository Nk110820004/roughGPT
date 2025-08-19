<script>
	import { onMount } from 'svelte';
	import { animate as anime } from 'animejs';

	let { 
		name, 
		size = 24, 
		color = 'currentColor',
		hoverScale = 1.1,
		clickScale = 0.9,
		rotation = false,
		pulse = false,
		bounce = false,
		class: className = '',
		onclick = null,
		...rest
	} = $props();

	let iconElement;
	let isHovered = $state(false);
	let isPressed = $state(false);

	const iconPaths = {
		add: '/add.svg',
		delete: '/delete.svg',
		edit: '/edit.svg',
		list: '/list.svg',
		board: '/board.svg',
		search: '/search.svg',
		logout: '/logout.svg',
		disconnect: '/disconnect.svg',
		check: '/check.svg',
		category: '/category.svg',
		moon: '/moon.svg',
		sun: '/sun.svg',
		plug: '/plug.svg',
		socket: '/socket.svg'
	};

	function animateHover() {
		if (!iconElement) return;
		
		isHovered = true;
		
		anime({
			targets: iconElement,
			scale: hoverScale,
			duration: 200,
			easing: 'easeOutQuad'
		});

		if (rotation) {
			anime({
				targets: iconElement.querySelector('svg'),
				rotate: '1turn',
				duration: 600,
				easing: 'easeInOutQuad'
			});
		}

		if (bounce) {
			anime({
				targets: iconElement,
				translateY: [-2, 0],
				duration: 300,
				easing: 'easeOutBounce'
			});
		}
	}

	function animateLeave() {
		if (!iconElement) return;
		
		isHovered = false;
		
		anime({
			targets: iconElement,
			scale: 1,
			translateY: 0,
			duration: 200,
			easing: 'easeOutQuad'
		});
	}

	function animateClick() {
		if (!iconElement) return;
		
		isPressed = true;
		
		anime({
			targets: iconElement,
			scale: [1, clickScale, hoverScale],
			duration: 150,
			easing: 'easeOutQuad',
			complete: () => {
				isPressed = false;
				if (onclick) onclick();
			}
		});
	}

	onMount(() => {
		if (!iconElement) return;

		try {
			if (pulse) {
				anime({
					targets: iconElement,
					scale: [1, 1.05, 1],
					duration: 2000,
					loop: true,
					easing: 'easeInOutSine'
				});
			}

			// Stagger animation for initial load
			anime({
				targets: iconElement,
				opacity: [0, 1],
				scale: [0.8, 1],
				duration: 400,
				easing: 'easeOutBack'
			});
		} catch (error) {
			console.warn('AnimatedIcon animation error:', error);
		}
	});
</script>

<div
	bind:this={iconElement}
	class="animated-icon {className}"
	class:clickable={onclick}
	onmouseenter={animateHover}
	onmouseleave={animateLeave}
	onclick={onclick ? animateClick : null}
	role={onclick ? 'button' : 'img'}
	tabindex={onclick ? 0 : null}
	onkeydown={(e) => onclick && (e.key === 'Enter' || e.key === ' ') && animateClick()}
	style="width: {size}px; height: {size}px; color: {color};"
	{...rest}
>
	{#if iconPaths[name]}
		<img
			src={iconPaths[name]}
			alt={name}
			style="width: 100%; height: 100%; filter: {color === '#ffffff' || color === 'white' || color === 'currentColor' ? 'brightness(0) saturate(100%) invert(100%)' : 'brightness(0) saturate(100%)'}"
		/>
	{:else}
		<!-- Fallback emoji icons -->
		<span class="emoji-icon">
			{#if name === 'home'}🏠
			{:else if name === 'work'}💼
			{:else if name === 'shopping'}🛒
			{:else if name === 'health'}🏃
			{:else if name === 'learning'}📚
			{:else if name === 'personal'}👤
			{:else if name === 'save'}💾
			{:else if name === 'close'}✕
			{:else if name === 'menu'}☰
			{:else}📋
			{/if}
		</span>
	{/if}
</div>

<style>
	.animated-icon {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		transition: all 0.2s ease;
		transform-origin: center;
		user-select: none;
	}

	.animated-icon.clickable {
		cursor: pointer;
	}

	.animated-icon.clickable:focus {
		outline: 2px solid var(--primary, #667eea);
		outline-offset: 2px;
		border-radius: 4px;
	}

	.emoji-icon {
		font-size: inherit;
		line-height: 1;
	}

	.animated-icon img {
		transition: filter 0.2s ease;
		opacity: 1;
		display: block;
	}

	.animated-icon:hover img {
		filter: brightness(0) saturate(100%) invert(27%) sepia(90%) saturate(3000%) hue-rotate(240deg) brightness(110%) contrast(110%) !important;
	}

	/* Ensure disconnect icon is always visible */
	.animated-icon img[alt="disconnect"] {
		filter: brightness(0) saturate(100%) invert(60%) sepia(69%) saturate(5000%) hue-rotate(21deg) brightness(95%) contrast(101%) !important;
	}
</style>
