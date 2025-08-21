<script>
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';

	let { data } = $props();
	let userName = $state('');
	let apiKey = $state('');
	let showWelcome = $state(true);
	let isConnecting = $state(false);
	let errorMessage = $state('');
	let showApiKey = $state(false);
	let titleElement = $state(null);
	let subtitleElement = $state(null);
	let featuresElement = $state(null);
	let isVisible = $state(false);
	let scrollY = $state(0);
	let mouseX = $state(0);
	let mouseY = $state(0);
	let particles = $state([]);

	// Typing effect for hero title
	let displayTitle = $state('');
	let titleComplete = $state(false);
	const fullTitle = 'TaskFlow';

	async function startApp() {
		if (userName.trim() && apiKey.trim()) {
			isConnecting = true;
			errorMessage = '';

			try {
				// First test if API key is valid
				const apiTestResult = await testPineconeConnection(apiKey.trim());

				// Now check if user exists or create new user
				const userResult = await checkOrCreateUser(userName.trim(), apiKey.trim());

				if (userResult.success) {
					localStorage.setItem('userName', userName.trim());
					localStorage.setItem('pineconeApiKey', apiKey.trim());
					localStorage.setItem('pineconeConnected', 'true');
					goto('/workspace');
				} else {
					errorMessage = userResult.message;
					isConnecting = false;
				}
			} catch (error) {
				console.error('Connection error:', error);
				errorMessage = 'Invalid Pinecone API key. Please check and try again.';
				isConnecting = false;
			}
		}
	}

	async function testPineconeConnection(key) {
		try {
			const response = await fetch('/create-index', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					apiKey: key,
					cloud: 'aws',
					region: 'us-east-1'
				})
			});

			if (!response.ok) {
				const errorData = await response.text();
				console.error('API response error:', errorData);
				throw new Error('API key validation failed');
			}

			return await response.json();
		} catch (error) {
			console.error('API connection error:', error);
			throw error;
		}
	}

	async function checkOrCreateUser(username, apiKey) {
		try {
			console.log('Checking for user:', username);

			// First try to search for existing user data
			const searchResponse = await fetch('/search-note', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					apiKey: apiKey,
					text: `User: ${username}`
				})
			});

			if (searchResponse.ok) {
				const searchResults = await searchResponse.json();
				console.log('Search results for user:', searchResults);

				if (searchResults.matches && searchResults.matches.length > 0) {
					// Check if any of the matches contain the exact username
					const userMatch = searchResults.matches.find(match => {
						const fullText = match.metadata?.text || match.metadata?.full_text || '';
						console.log('Checking match:', fullText.substring(0, 100) + '...');

						// More flexible matching for user data
						return fullText.includes(`User: ${username}\n`) ||
							   fullText.startsWith(`User: ${username}`) ||
							   (fullText.includes(`User: ${username}`) && fullText.includes('Todos:'));
					});

					if (userMatch) {
						console.log('Found existing user data');
						return { success: true, message: 'Welcome back!' };
					} else {
						console.log('User searched but no exact match found');
						// New user, create entry
						const createResponse = await fetch('/insert-note', {
							method: 'POST',
							headers: { 'Content-Type': 'application/json' },
							body: JSON.stringify({
								apiKey: apiKey,
								fullText: `User: ${username}\nAccount created: ${new Date().toISOString()}\nTodos: []`
							})
						});

						if (createResponse.ok) {
							console.log('Created new user account');
							return { success: true, message: 'Welcome! New account created.' };
						} else {
							console.error('Failed to create user account');
							return { success: false, message: 'Failed to create user account.' };
						}
					}
				} else {
					console.log('No search results, creating new user');
					// New user, create entry
					const createResponse = await fetch('/insert-note', {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({
							apiKey: apiKey,
							fullText: `User: ${username}\nAccount created: ${new Date().toISOString()}\nTodos: []`
						})
					});

					if (createResponse.ok) {
						console.log('Created new user account');
						return { success: true, message: 'Welcome! New account created.' };
					} else {
						console.error('Failed to create user account');
						return { success: false, message: 'Failed to create user account.' };
					}
				}
			} else {
				console.error('Search request failed');
				return { success: false, message: 'Failed to validate user.' };
			}
		} catch (error) {
			console.error('User validation error:', error);
			return { success: false, message: 'Error validating user account.' };
		}
	}

	// Initialize particles for background animation
	function initParticles() {
		particles = Array.from({ length: 50 }, (_, i) => ({
			id: i,
			x: Math.random() * 100,
			y: Math.random() * 100,
			size: Math.random() * 3 + 1,
			speed: Math.random() * 0.5 + 0.1,
			opacity: Math.random() * 0.6 + 0.2
		}));
	}

	// Animate particles
	function animateParticles() {
		particles = particles.map(particle => ({
			...particle,
			y: (particle.y + particle.speed) % 100,
			x: particle.x + Math.sin(Date.now() * 0.001 + particle.id) * 0.02
		}));
	}

	// Typing effect
	function startTypingEffect() {
		let i = 0;
		const typeInterval = setInterval(() => {
			if (i < fullTitle.length) {
				displayTitle = fullTitle.slice(0, i + 1);
				i++;
			} else {
				titleComplete = true;
				clearInterval(typeInterval);
			}
		}, 150);
	}

	// Scroll progress
	function updateScrollProgress() {
		const winScroll = document.body.scrollTop || document.documentElement.scrollTop;
		const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
		const scrolled = (winScroll / height) * 100;
		
		if (typeof window !== 'undefined') {
			document.documentElement.style.setProperty('--scroll-progress', scrolled + '%');
		}
	}

	onMount(() => {
		const savedName = localStorage.getItem('userName');
		const pineconeConnected = localStorage.getItem('pineconeConnected');
		const apiKey = localStorage.getItem('pineconeApiKey');

		if (savedName && pineconeConnected && apiKey) {
			goto('/workspace');
		}

		// Initialize animations
		isVisible = true;
		initParticles();
		startTypingEffect();

		// Particle animation loop
		const particleInterval = setInterval(animateParticles, 50);

		// Scroll event listener
		const handleScroll = () => {
			scrollY = window.scrollY;
			updateScrollProgress();
		};

		// Mouse move event listener
		const handleMouseMove = (e) => {
			mouseX = e.clientX;
			mouseY = e.clientY;
		};

		if (typeof window !== 'undefined') {
			window.addEventListener('scroll', handleScroll);
			window.addEventListener('mousemove', handleMouseMove);
		}

		// Intersection Observer for scroll animations
		const observer = new IntersectionObserver((entries) => {
			entries.forEach(entry => {
				if (entry.isIntersecting) {
					entry.target.classList.add('animate-in');
				}
			});
		}, { threshold: 0.1 });

		// Observe feature elements
		const featureItems = document.querySelectorAll('.feature-item');
		featureItems.forEach(item => observer.observe(item));

		return () => {
			clearInterval(particleInterval);
			if (typeof window !== 'undefined') {
				window.removeEventListener('scroll', handleScroll);
				window.removeEventListener('mousemove', handleMouseMove);
			}
			observer.disconnect();
		};
	});
</script>

<svelte:window bind:scrollY />

<!-- Scroll Progress Indicator -->
<div class="scroll-progress"></div>

<div class="welcome-container">
	<!-- Animated Background Particles -->
	<div class="particles-container">
		{#each particles as particle (particle.id)}
			<div 
				class="particle"
				style="
					left: {particle.x}%;
					top: {particle.y}%;
					width: {particle.size}px;
					height: {particle.size}px;
					opacity: {particle.opacity};
				"
			></div>
		{/each}
	</div>

	<!-- Animated Background SVG Elements -->
	<div class="background-shapes">
		<svg class="bg-shape shape-1" viewBox="0 0 200 200">
			<defs>
				<linearGradient id="gradient1" x1="0%" y1="0%" x2="100%" y2="100%">
					<stop offset="0%" style="stop-color:#ff6b6b;stop-opacity:0.3" />
					<stop offset="100%" style="stop-color:#4ecdc4;stop-opacity:0.1" />
				</linearGradient>
			</defs>
			<path d="M50,50 Q150,30 150,150 Q30,150 50,50" fill="url(#gradient1)" />
		</svg>
		
		<svg class="bg-shape shape-2" viewBox="0 0 200 200">
			<defs>
				<linearGradient id="gradient2" x1="0%" y1="0%" x2="100%" y2="100%">
					<stop offset="0%" style="stop-color:#6366f1;stop-opacity:0.2" />
					<stop offset="100%" style="stop-color:#8b5cf6;stop-opacity:0.1" />
				</linearGradient>
			</defs>
			<circle cx="100" cy="100" r="60" fill="url(#gradient2)" />
		</svg>

		<svg class="bg-shape shape-3" viewBox="0 0 200 200">
			<defs>
				<linearGradient id="gradient3" x1="0%" y1="0%" x2="100%" y2="100%">
					<stop offset="0%" style="stop-color:#f59e0b;stop-opacity:0.2" />
					<stop offset="100%" style="stop-color:#10b981;stop-opacity:0.1" />
				</linearGradient>
			</defs>
			<polygon points="100,20 180,180 20,180" fill="url(#gradient3)" />
		</svg>
	</div>

	<div class="hero-section">
		<div class="floating-elements">
			<div class="floating-card card-1" style="transform: translateY({scrollY * 0.1}px)">
				<div class="card-glow"></div>
			</div>
			<div class="floating-card card-2" style="transform: translateY({scrollY * -0.05}px) translateX({Math.sin(scrollY * 0.01) * 10}px)">
				<div class="card-glow"></div>
			</div>
			<div class="floating-card card-3" style="transform: translateY({scrollY * 0.08}px) rotate({scrollY * 0.1}deg)">
				<div class="card-glow"></div>
			</div>
		</div>
		
		<div class="main-content" class:visible={isVisible}>
			<!-- Animated Hero Illustration -->
			<div class="hero-illustration">
				<svg class="floating-orb" viewBox="0 0 100 100">
					<defs>
						<radialGradient id="orbGradient">
							<stop offset="0%" style="stop-color:#ffffff;stop-opacity:0.8" />
							<stop offset="100%" style="stop-color:#6366f1;stop-opacity:0.3" />
						</radialGradient>
					</defs>
					<circle cx="50" cy="50" r="30" fill="url(#orbGradient)" class="pulse" />
					<circle cx="50" cy="50" r="20" fill="none" stroke="rgba(255,255,255,0.5)" stroke-width="1" class="orbit-ring" />
					<circle cx="50" cy="50" r="35" fill="none" stroke="rgba(255,255,255,0.3)" stroke-width="0.5" class="orbit-ring-outer" />
				</svg>
			</div>

			<h1 bind:this={titleElement} class="title typewriter">
				{displayTitle}<span class="cursor" class:hidden={titleComplete}>|</span>
			</h1>
			
			<p bind:this={subtitleElement} class="subtitle animated-subtitle" class:fade-in={titleComplete}>
				{#each 'Your beautiful, organized workspace for everything'.split(' ') as word, i}
					<span class="word" style="animation-delay: {titleComplete ? i * 0.1 + 0.5 : 0}s">{word}</span>
				{/each}
			</p>
			
			<div class="input-container glass-morphism" class:slide-up={titleComplete}>
				<input
					type="text"
					placeholder="What's your name?"
					bind:value={userName}
					class="name-input animated-input"
					onkeypress={(e) => e.key === 'Enter' && document.querySelector('.api-input').focus()}
				/>
				<div class="api-input-container">
					<input
						type={showApiKey ? 'text' : 'password'}
						placeholder="Enter your Pinecone.io API key (e.g., pcsk_...)"
						bind:value={apiKey}
						class="api-input animated-input"
						onkeypress={(e) => e.key === 'Enter' && startApp()}
					/>
					<button type="button" class="toggle-api-visibility icon-hover" onclick={() => showApiKey = !showApiKey}>
						{#if showApiKey}
							<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="icon-animate">
								<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
								<line x1="1" y1="1" x2="23" y2="23"/>
							</svg>
						{:else}
							<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="icon-animate">
								<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
								<circle cx="12" cy="12" r="3"/>
							</svg>
						{/if}
					</button>
				</div>
				{#if errorMessage}
					<div class="error-message animate-shake">{errorMessage}</div>
				{/if}
				{#if isConnecting}
					<div class="info-message pulse-glow">
						<span class="loading-spinner"></span>
						Testing API connection and validating user...
					</div>
				{/if}
				<button class="start-button gradient-button" onclick={startApp} disabled={!userName.trim() || !apiKey.trim() || isConnecting}>
					{#if isConnecting}
						<span class="loading-spinner"></span>
						Connecting to Pinecone...
					{:else}
						Connect & Get Started
						<span class="button-shine"></span>
					{/if}
				</button>
				<div class="api-info glass-card">
					<p><strong class="highlight-text">🔗 Get your Pinecone API key:</strong></p>
					<p>1. Go to <a href="https://pinecone.io" target="_blank" rel="noopener" class="glow-link">pinecone.io</a></p>
					<p>2. Sign in to your account</p>
					<p>3. Navigate to API Keys section</p>
					<p>4. Copy your API key (starts with "pcsk_")</p>
				</div>
			</div>
			
			<div bind:this={featuresElement} class="features-preview">
				<div class="feature-item glass-card" data-tilt>
					<div class="feature-icon animated-icon">
						<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="draw-svg">
							<path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>
							<path d="M15 5l4 4"/>
						</svg>
					</div>
					<span class="feature-text">Rich Text Editing</span>
				</div>
				<div class="feature-item glass-card" data-tilt>
					<div class="feature-icon animated-icon">
						<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="draw-svg">
							<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
							<polyline points="9,22 9,12 15,12 15,22"/>
							<rect x="7" y="14" width="2" height="2"/>
							<rect x="15" y="14" width="2" height="2"/>
						</svg>
					</div>
					<span class="feature-text">Organize & Categorize</span>
				</div>
				<div class="feature-item glass-card" data-tilt>
					<div class="feature-icon animated-icon">
						<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="draw-svg">
							<circle cx="11" cy="11" r="8"/>
							<path d="m21 21-4.35-4.35"/>
						</svg>
					</div>
					<span class="feature-text">Powerful Search</span>
				</div>
				<div class="feature-item glass-card" data-tilt>
					<div class="feature-icon animated-icon">
						<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="draw-svg">
							<rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
							<line x1="8" y1="21" x2="16" y2="21"/>
							<line x1="12" y1="17" x2="12" y2="21"/>
						</svg>
					</div>
					<span class="feature-text">Responsive Design</span>
				</div>
			</div>
		</div>
	</div>
</div>

<style>
	/* Scroll Progress Indicator */
	.scroll-progress {
		position: fixed;
		top: 0;
		left: 0;
		width: var(--scroll-progress, 0%);
		height: 4px;
		background: linear-gradient(90deg, #ff6b6b, #4ecdc4, #45b7d1, #f39c12);
		z-index: 1000;
		transition: width 0.25s ease;
	}

	.welcome-container {
		min-height: 100vh;
		background: linear-gradient(135deg,
			#6366f1 0%,
			#8b5cf6 25%,
			#ec4899 50%,
			#f59e0b 75%,
			#10b981 100%);
		background-attachment: fixed;
		background-size: 400% 400%;
		animation: gradientShift 8s ease infinite;
		display: flex;
		align-items: center;
		justify-content: center;
		position: relative;
		overflow: hidden;
	}

	@keyframes gradientShift {
		0% { background-position: 0% 50%; }
		50% { background-position: 100% 50%; }
		100% { background-position: 0% 50%; }
	}

	/* Animated Background Particles */
	.particles-container {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		pointer-events: none;
		z-index: 1;
	}

	.particle {
		position: absolute;
		background: radial-gradient(circle, rgba(255,255,255,0.8) 0%, rgba(255,255,255,0) 100%);
		border-radius: 50%;
		animation: particleFloat 3s ease-in-out infinite;
	}

	@keyframes particleFloat {
		0%, 100% { transform: translateY(0px) scale(1); }
		50% { transform: translateY(-10px) scale(1.1); }
	}

	/* Background Shapes */
	.background-shapes {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		pointer-events: none;
		z-index: 1;
	}

	.bg-shape {
		position: absolute;
		width: 200px;
		height: 200px;
		opacity: 0.3;
	}

	.shape-1 {
		top: 10%;
		left: 5%;
		animation: morphShape 8s ease-in-out infinite;
	}

	.shape-2 {
		top: 60%;
		right: 10%;
		animation: rotateShape 10s linear infinite;
	}

	.shape-3 {
		bottom: 20%;
		left: 15%;
		animation: pulseShape 6s ease-in-out infinite;
	}

	@keyframes morphShape {
		0%, 100% { transform: scale(1) rotate(0deg); }
		50% { transform: scale(1.2) rotate(180deg); }
	}

	@keyframes rotateShape {
		0% { transform: rotate(0deg); }
		100% { transform: rotate(360deg); }
	}

	@keyframes pulseShape {
		0%, 100% { transform: scale(1); opacity: 0.3; }
		50% { transform: scale(1.5); opacity: 0.1; }
	}

	.floating-elements {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		z-index: 2;
		pointer-events: none;
	}

	.floating-card {
		position: absolute;
		background: rgba(255, 255, 255, 0.1);
		border-radius: 20px;
		backdrop-filter: blur(10px);
		border: 1px solid rgba(255, 255, 255, 0.2);
		overflow: hidden;
	}

	.card-glow {
		position: absolute;
		top: -50%;
		left: -50%;
		width: 200%;
		height: 200%;
		background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%);
		animation: cardGlow 4s ease-in-out infinite;
	}

	@keyframes cardGlow {
		0%, 100% { opacity: 0.3; transform: scale(1); }
		50% { opacity: 0.7; transform: scale(1.1); }
	}

	.card-1 {
		width: 120px;
		height: 80px;
		top: 20%;
		left: 10%;
		animation: float 6s ease-in-out infinite;
	}

	.card-2 {
		width: 100px;
		height: 100px;
		top: 60%;
		right: 15%;
		animation: float 8s ease-in-out infinite reverse;
	}

	.card-3 {
		width: 80px;
		height: 120px;
		bottom: 30%;
		left: 20%;
		animation: float 7s ease-in-out infinite;
	}

	@keyframes float {
		0%, 100% { transform: translateY(0px) rotate(0deg); }
		50% { transform: translateY(-20px) rotate(5deg); }
	}

	.hero-section {
		position: relative;
		z-index: 10;
		text-align: center;
		max-width: 600px;
		padding: 2rem;
		margin: 0 auto;
		width: 100%;
		box-sizing: border-box;
	}

	/* Hero Illustration */
	.hero-illustration {
		position: relative;
		width: 100px;
		height: 100px;
		margin: 0 auto 2rem;
		z-index: 15;
	}

	.floating-orb {
		width: 100%;
		height: 100%;
		animation: orbFloat 4s ease-in-out infinite;
	}

	.pulse {
		animation: orbPulse 2s ease-in-out infinite;
	}

	.orbit-ring {
		animation: orbitRing 8s linear infinite;
		transform-origin: center;
	}

	.orbit-ring-outer {
		animation: orbitRing 12s linear infinite reverse;
		transform-origin: center;
	}

	@keyframes orbFloat {
		0%, 100% { transform: translateY(0px) scale(1); }
		50% { transform: translateY(-10px) scale(1.05); }
	}

	@keyframes orbPulse {
		0%, 100% { opacity: 0.8; }
		50% { opacity: 0.4; }
	}

	@keyframes orbitRing {
		0% { transform: rotate(0deg); }
		100% { transform: rotate(360deg); }
	}

	.main-content {
		opacity: 0;
		transform: translateY(30px);
		transition: all 1s ease;
	}

	.main-content.visible {
		opacity: 1;
		transform: translateY(0);
	}

	/* Typing Effect */
	.title {
		font-size: clamp(3rem, 8vw, 6rem);
		font-weight: 800;
		color: white;
		margin-bottom: 1rem;
		text-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
		letter-spacing: -2px;
		position: relative;
	}

	.typewriter {
		overflow: hidden;
		white-space: nowrap;
	}

	.cursor {
		color: #ff6b6b;
		animation: blink 1s infinite;
	}

	.cursor.hidden {
		opacity: 0;
	}

	@keyframes blink {
		0%, 50% { opacity: 1; }
		51%, 100% { opacity: 0; }
	}

	/* Animated Subtitle */
	.subtitle {
		font-size: clamp(1.2rem, 3vw, 1.5rem);
		color: rgba(255, 255, 255, 0.9);
		margin-bottom: 3rem;
		font-weight: 300;
		line-height: 1.6;
	}

	.animated-subtitle .word {
		display: inline-block;
		opacity: 0;
		margin-right: 0.3em;
		animation: wordFadeIn 0.6s ease forwards;
	}

	@keyframes wordFadeIn {
		0% {
			opacity: 0;
			transform: translateY(20px);
		}
		100% {
			opacity: 1;
			transform: translateY(0);
		}
	}

	/* Glass Morphism Effects */
	.glass-morphism {
		background: rgba(255, 255, 255, 0.15);
		backdrop-filter: blur(20px);
		border-radius: 25px;
		border: 1px solid rgba(255, 255, 255, 0.2);
		box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
	}

	.glass-card {
		background: rgba(255, 255, 255, 0.1);
		backdrop-filter: blur(10px);
		border: 1px solid rgba(255, 255, 255, 0.2);
	}

	.input-container {
		padding: 1.5rem;
		margin-bottom: 3rem;
		position: relative;
		z-index: 15;
		opacity: 0;
		transform: translateY(30px);
		transition: all 0.8s ease;
	}

	.input-container.slide-up {
		opacity: 1;
		transform: translateY(0);
	}

	.animated-input {
		width: 100%;
		padding: 1rem 1.5rem;
		border: none;
		border-radius: 15px;
		font-size: 1.1rem;
		background: rgba(255, 255, 255, 0.9);
		margin-bottom: 1rem;
		outline: none;
		transition: all 0.3s ease;
		position: relative;
		z-index: 20;
		pointer-events: auto;
		cursor: text;
	}

	.animated-input:focus {
		background: white;
		box-shadow: 0 5px 20px rgba(0, 0, 0, 0.1), 0 0 0 3px rgba(99, 102, 241, 0.2);
		transform: translateY(-2px);
	}

	.api-input-container {
		position: relative;
		margin-bottom: 1rem;
	}

	.api-input {
		width: 100%;
		padding: 1rem 3rem 1rem 1.5rem;
		border: none;
		border-radius: 15px;
		font-size: 1rem;
		background: rgba(255, 255, 255, 0.9);
		outline: none;
		transition: all 0.3s ease;
		position: relative;
		z-index: 20;
		pointer-events: auto;
		cursor: text;
		font-family: monospace;
		box-sizing: border-box;
	}

	.api-input:focus {
		background: white;
		box-shadow: 0 5px 20px rgba(0, 0, 0, 0.1), 0 0 0 3px rgba(99, 102, 241, 0.2);
		transform: translateY(-2px);
	}

	.toggle-api-visibility {
		position: absolute;
		right: 1rem;
		top: 50%;
		transform: translateY(-50%);
		background: none;
		border: none;
		cursor: pointer;
		color: #6b7280;
		z-index: 25;
		padding: 0.25rem;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 4px;
		transition: all 0.2s ease;
	}

	.icon-hover:hover {
		background: rgba(0, 0, 0, 0.05);
		color: #374151;
		transform: translateY(-50%) scale(1.1);
	}

	.icon-animate {
		transition: all 0.3s ease;
	}

	.icon-hover:hover .icon-animate {
		animation: iconBounce 0.6s ease;
	}

	@keyframes iconBounce {
		0%, 100% { transform: scale(1); }
		50% { transform: scale(1.2); }
	}

	.error-message {
		background: rgba(239, 68, 68, 0.1);
		color: #dc2626;
		padding: 0.75rem 1rem;
		border-radius: 10px;
		margin-bottom: 1rem;
		border: 1px solid rgba(239, 68, 68, 0.2);
		font-size: 0.9rem;
		text-align: center;
	}

	.animate-shake {
		animation: shake 0.5s ease-in-out;
	}

	@keyframes shake {
		0%, 100% { transform: translateX(0); }
		25% { transform: translateX(-5px); }
		75% { transform: translateX(5px); }
	}

	.info-message {
		background: rgba(59, 130, 246, 0.1);
		color: #2563eb;
		padding: 0.75rem 1rem;
		border-radius: 10px;
		margin-bottom: 1rem;
		border: 1px solid rgba(59, 130, 246, 0.2);
		font-size: 0.9rem;
		text-align: center;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
	}

	.pulse-glow {
		animation: pulseGlow 2s ease-in-out infinite;
	}

	@keyframes pulseGlow {
		0%, 100% { box-shadow: 0 0 5px rgba(59, 130, 246, 0.3); }
		50% { box-shadow: 0 0 20px rgba(59, 130, 246, 0.6); }
	}

	.api-info {
		padding: 1rem;
		border-radius: 15px;
		margin-top: 1rem;
		font-size: 0.85rem;
		color: rgba(255, 255, 255, 0.9);
	}

	.api-info p {
		margin: 0.5rem 0;
	}

	.glow-link {
		color: #60a5fa;
		text-decoration: none;
		font-weight: 600;
		position: relative;
		transition: all 0.3s ease;
	}

	.glow-link:hover {
		text-decoration: underline;
		text-shadow: 0 0 8px rgba(96, 165, 250, 0.6);
	}

	.highlight-text {
		background: linear-gradient(45deg, #ff6b6b, #4ecdc4);
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
	}

	.loading-spinner {
		display: inline-block;
		width: 16px;
		height: 16px;
		border: 2px solid rgba(255, 255, 255, 0.3);
		border-radius: 50%;
		border-top-color: white;
		animation: spin 1s ease-in-out infinite;
		margin-right: 0.5rem;
	}

	@keyframes spin {
		to { transform: rotate(360deg); }
	}

	/* Gradient Button */
	.start-button {
		width: 100%;
		padding: 1rem 2rem;
		background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%);
		color: white;
		border: none;
		border-radius: 15px;
		font-size: 1.1rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.3s ease;
		box-shadow: 0 10px 25px rgba(238, 90, 36, 0.3);
		position: relative;
		z-index: 20;
		overflow: hidden;
	}

	.gradient-button {
		position: relative;
		overflow: hidden;
	}

	.button-shine {
		position: absolute;
		top: 0;
		left: -100%;
		width: 100%;
		height: 100%;
		background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
		transition: left 0.6s;
	}

	.start-button:hover:not(:disabled) {
		transform: translateY(-3px);
		box-shadow: 0 15px 35px rgba(238, 90, 36, 0.4);
	}

	.start-button:hover:not(:disabled) .button-shine {
		left: 100%;
	}

	.start-button:disabled {
		opacity: 0.6;
		cursor: not-allowed;
		transform: none;
		box-shadow: none;
	}

	.features-preview {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
		gap: 1.5rem;
		max-width: 500px;
		margin: 0 auto;
	}

	.feature-item {
		border-radius: 15px;
		padding: 1.5rem 1rem;
		transition: all 0.3s ease;
		color: white;
		opacity: 0;
		transform: translateY(50px);
		cursor: pointer;
		position: relative;
		overflow: hidden;
	}

	/* Scroll-triggered animations */
	.feature-item.animate-in {
		opacity: 1;
		transform: translateY(0);
	}

	.feature-item:nth-child(1).animate-in { animation-delay: 0.1s; }
	.feature-item:nth-child(2).animate-in { animation-delay: 0.2s; }
	.feature-item:nth-child(3).animate-in { animation-delay: 0.3s; }
	.feature-item:nth-child(4).animate-in { animation-delay: 0.4s; }

	.feature-item:hover {
		transform: translateY(-10px) scale(1.05);
		background: rgba(255, 255, 255, 0.15);
		box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
	}

	/* 3D Tilt Effect */
	.feature-item[data-tilt]:hover {
		transform: perspective(1000px) rotateY(10deg) rotateX(10deg) translateY(-10px);
	}

	.feature-icon {
		margin-bottom: 0.75rem;
		display: flex;
		justify-content: center;
		align-items: center;
		width: 48px;
		height: 48px;
		margin: 0 auto 0.75rem;
		background: rgba(255, 255, 255, 0.1);
		border-radius: 12px;
		color: white;
		position: relative;
		overflow: hidden;
	}

	.animated-icon {
		transition: all 0.3s ease;
	}

	.feature-item:hover .animated-icon {
		transform: scale(1.1) rotate(5deg);
		background: rgba(255, 255, 255, 0.2);
	}

	/* SVG Drawing Animation */
	.draw-svg {
		stroke-dasharray: 100;
		stroke-dashoffset: 100;
	}

	.feature-item.animate-in .draw-svg {
		animation: drawSVG 1s ease forwards;
	}

	@keyframes drawSVG {
		to {
			stroke-dashoffset: 0;
		}
	}

	.feature-text {
		display: block;
		transition: all 0.3s ease;
	}

	.feature-item:hover .feature-text {
		transform: translateY(-2px);
		color: #fff;
		text-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
	}

	@media (max-width: 768px) {
		.features-preview {
			grid-template-columns: repeat(2, 1fr);
			gap: 1rem;
		}
		
		.hero-section {
			padding: 1rem;
		}
		
		.input-container {
			padding: 1rem;
			margin-bottom: 2rem;
		}

		.welcome-container {
			padding: 1rem;
		}

		.title {
			font-size: clamp(2.5rem, 8vw, 4rem);
			margin-bottom: 0.75rem;
		}

		.subtitle {
			font-size: clamp(1rem, 4vw, 1.2rem);
			margin-bottom: 2rem;
		}

		.floating-card {
			display: none;
		}

		.bg-shape {
			width: 120px;
			height: 120px;
		}

		.hero-illustration {
			width: 80px;
			height: 80px;
		}

		.particles-container {
			display: none;
		}
	}

	/* Reduced motion preferences */
	@media (prefers-reduced-motion: reduce) {
		.floating-card,
		.particle,
		.bg-shape,
		.floating-orb,
		.orbit-ring,
		.orbit-ring-outer,
		.button-shine {
			animation: none;
		}
		
		.feature-item:hover {
			transform: translateY(-5px) scale(1.02);
		}
	}
</style>
