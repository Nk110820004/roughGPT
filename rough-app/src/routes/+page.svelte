<script>
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';

	let { data } = $props();
	
	let userName = $state('');
	let apiKey = $state('');
	let showWelcome = true;
	let isConnecting = $state(false);
	let errorMessage = $state('');
	let showApiKey = $state(false);
	let mouseX = $state(0);
	let mouseY = $state(0);
	let particles = $state([]);
	let animatedElements = $state([]);

	onMount(() => {
		// Create floating particles
		const newParticles = [];
		for (let i = 0; i < 20; i++) {
			newParticles.push({
				id: i,
				x: Math.random() * window.innerWidth,
				y: Math.random() * window.innerHeight,
				size: Math.random() * 4 + 2,
				speedX: (Math.random() - 0.5) * 2,
				speedY: (Math.random() - 0.5) * 2,
				opacity: Math.random() * 0.5 + 0.3
			});
		}
		particles = newParticles;

		// Create animated geometric elements
		const newElements = [];
		for (let i = 0; i < 8; i++) {
			newElements.push({
				id: i,
				type: ['circle', 'triangle', 'square', 'hexagon'][Math.floor(Math.random() * 4)],
				x: Math.random() * 100,
				y: Math.random() * 100,
				size: Math.random() * 60 + 20,
				rotation: Math.random() * 360,
				animationDelay: Math.random() * 5
			});
		}
		animatedElements = newElements;

		// Mouse tracking for interactive effects
		const handleMouseMove = (e) => {
			mouseX = e.clientX;
			mouseY = e.clientY;
		};

		// Particle animation loop
		const animateParticles = () => {
			particles = particles.map(particle => ({
				...particle,
				x: particle.x + particle.speedX,
				y: particle.y + particle.speedY,
				x: particle.x > window.innerWidth ? 0 : particle.x < 0 ? window.innerWidth : particle.x,
				y: particle.y > window.innerHeight ? 0 : particle.y < 0 ? window.innerHeight : particle.y
			}));
			requestAnimationFrame(animateParticles);
		};

		window.addEventListener('mousemove', handleMouseMove);
		animateParticles();

		const savedName = localStorage.getItem('userName');
		const pineconeConnected = localStorage.getItem('pineconeConnected');
		const storedApiKey = localStorage.getItem('pineconeApiKey');

		if (savedName && pineconeConnected && storedApiKey) {
			goto('/workspace');
		}

		return () => {
			window.removeEventListener('mousemove', handleMouseMove);
		};
	});

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

	function handleNameKeydown(e) {
		if (e.key === 'Enter') {
			const apiInput = document.querySelector('.api-input');
			if (apiInput) apiInput.focus();
		}
	}

	function handleApiKeydown(e) {
		if (e.key === 'Enter') {
			startApp();
		}
	}

	function toggleApiVisibility() {
		showApiKey = !showApiKey;
	}
</script>

<div class="welcome-container">
	<!-- Enhanced floating elements with interactive animations -->
	<div class="floating-elements">
		<!-- Animated particles -->
		{#each particles as particle (particle.id)}
			<div 
				class="particle" 
				style="left: {particle.x}px; top: {particle.y}px; width: {particle.size}px; height: {particle.size}px; opacity: {particle.opacity};"
			></div>
		{/each}

		<!-- Interactive geometric shapes -->
		{#each animatedElements as element (element.id)}
			<div 
				class="animated-shape {element.type}" 
				style="left: {element.x}%; top: {element.y}%; width: {element.size}px; height: {element.size}px; animation-delay: {element.animationDelay}s; transform: rotate({element.rotation}deg) translate({(mouseX - window.innerWidth/2) * 0.02}px, {(mouseY - window.innerHeight/2) * 0.02}px);"
			>
				{#if element.type === 'triangle'}
					<svg viewBox="0 0 100 100" class="shape-svg">
						<polygon points="50,10 90,90 10,90" fill="currentColor" />
					</svg>
				{:else if element.type === 'hexagon'}
					<svg viewBox="0 0 100 100" class="shape-svg">
						<polygon points="50,5 85,25 85,75 50,95 15,75 15,25" fill="currentColor" />
					</svg>
				{/if}
			</div>
		{/each}

		<!-- Enhanced floating cards with more variety -->
		<div class="floating-card card-1">
			<svg class="card-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
			</svg>
		</div>
		<div class="floating-card card-2">
			<svg class="card-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<circle cx="12" cy="12" r="10"/>
				<path d="M8 12l2 2 4-4"/>
			</svg>
		</div>
		<div class="floating-card card-3">
			<svg class="card-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
			</svg>
		</div>
		<div class="floating-card card-4">
			<svg class="card-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
				<polyline points="3.27,6.96 12,12.01 20.73,6.96"/>
				<line x1="12" y1="22.08" x2="12" y2="12"/>
			</svg>
		</div>
		<div class="floating-card card-5">
			<svg class="card-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
			</svg>
		</div>

		<!-- Added decorative SVG elements -->
		<div class="decorative-element deco-1">
			<svg viewBox="0 0 200 200" class="deco-svg">
				<defs>
					<linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
						<stop offset="0%" style="stop-color:rgba(255,255,255,0.3);stop-opacity:1" />
						<stop offset="100%" style="stop-color:rgba(255,255,255,0.1);stop-opacity:1" />
					</linearGradient>
				</defs>
				<circle cx="100" cy="100" r="80" fill="url(#grad1)" />
				<circle cx="100" cy="100" r="60" fill="none" stroke="rgba(255,255,255,0.2)" stroke-width="2" />
				<circle cx="100" cy="100" r="40" fill="none" stroke="rgba(255,255,255,0.3)" stroke-width="1" />
			</svg>
		</div>

		<div class="decorative-element deco-2">
			<svg viewBox="0 0 150 150" class="deco-svg">
				<path d="M75,10 L140,75 L75,140 L10,75 Z" fill="rgba(255,255,255,0.1)" stroke="rgba(255,255,255,0.2)" stroke-width="2"/>
				<path d="M75,30 L120,75 L75,120 L30,75 Z" fill="none" stroke="rgba(255,255,255,0.3)" stroke-width="1"/>
			</svg>
		</div>

		<div class="decorative-element deco-3">
			<svg viewBox="0 0 120 120" class="deco-svg">
				<polygon points="60,10 110,50 90,110 30,110 10,50" fill="rgba(255,255,255,0.15)" stroke="rgba(255,255,255,0.25)" stroke-width="2"/>
			</svg>
		</div>
	</div>
	
	<div class="hero-section">
		<div class="main-content">
			<!-- Enhanced title with animated text effects -->
			<h1 class="title">
				<span class="title-word" style="animation-delay: 0s;">Task</span><span class="title-word" style="animation-delay: 0.2s;">Flow</span>
			</h1>
			<p class="subtitle">Your beautiful, organized workspace for everything</p>
			
			<div class="input-container">
				<input
					type="text"
					placeholder="What's your name?"
					bind:value={userName}
					class="name-input"
					onkeydown={handleNameKeydown}
				/>
				<div class="api-input-container">
					<input
						type={showApiKey ? 'text' : 'password'}
						placeholder="Enter your Pinecone.io API key (e.g., pcsk_...)"
						bind:value={apiKey}
						class="api-input"
						onkeydown={handleApiKeydown}
					/>
					<button type="button" class="toggle-api-visibility" onclick={toggleApiVisibility}>
						{#if showApiKey}
							<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
								<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
								<line x1="1" y1="1" x2="23" y2="23"/>
							</svg>
						{:else}
							<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
								<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
								<circle cx="12" cy="12" r="3"/>
							</svg>
						{/if}
					</button>
				</div>
				{#if errorMessage}
					<div class="error-message">{errorMessage}</div>
				{/if}
				{#if isConnecting}
					<div class="info-message">
						<span class="loading-spinner"></span>
						Testing API connection and validating user...
					</div>
				{/if}
				<button class="start-button" onclick={startApp} disabled={!userName.trim() || !apiKey.trim() || isConnecting}>
					{#if isConnecting}
						<span class="loading-spinner"></span>
						Connecting to Pinecone...
					{:else}
						Connect & Get Started
						<svg class="button-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<path d="M5 12h14M12 5l7 7-7 7"/>
						</svg>
					{/if}
				</button>
				<div class="api-info">
					<p><strong>🔗 Get your Pinecone API key:</strong></p>
					<p>1. Go to <a href="https://pinecone.io" target="_blank" rel="noopener">pinecone.io</a></p>
					<p>2. Sign in to your account</p>
					<p>3. Navigate to API Keys section</p>
					<p>4. Copy your API key (starts with "pcsk_")</p>
				</div>
			</div>
			
			<!-- Enhanced features preview with more interactive elements -->
			<div class="features-preview">
				<div class="feature-item" style="animation-delay: 0.1s;">
					<div class="feature-icon">
						<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>
							<path d="M15 5l4 4"/>
						</svg>
					</div>
					<span>Rich Text Editing</span>
					<div class="feature-glow"></div>
				</div>
				<div class="feature-item" style="animation-delay: 0.2s;">
					<div class="feature-icon">
						<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
							<polyline points="9,22 9,12 15,12 15,22"/>
							<rect x="7" y="14" width="2" height="2"/>
							<rect x="15" y="14" width="2" height="2"/>
						</svg>
					</div>
					<span>Organize & Categorize</span>
					<div class="feature-glow"></div>
				</div>
				<div class="feature-item" style="animation-delay: 0.3s;">
					<div class="feature-icon">
						<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<circle cx="11" cy="11" r="8"/>
							<path d="m21 21-4.35-4.35"/>
						</svg>
					</div>
					<span>Powerful Search</span>
					<div class="feature-glow"></div>
				</div>
				<div class="feature-item" style="animation-delay: 0.4s;">
					<div class="feature-icon">
						<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
							<line x1="8" y1="21" x2="16" y2="21"/>
							<line x1="12" y1="17" x2="12" y2="21"/>
						</svg>
					</div>
					<span>Responsive Design</span>
					<div class="feature-glow"></div>
				</div>
			</div>

			<!-- Added interactive stats section -->
			<div class="stats-section">
				<div class="stat-item">
					<div class="stat-number" data-target="10000">0</div>
					<div class="stat-label">Tasks Completed</div>
				</div>
				<div class="stat-item">
					<div class="stat-number" data-target="500">0</div>
					<div class="stat-label">Happy Users</div>
				</div>
				<div class="stat-item">
					<div class="stat-number" data-target="99">0</div>
					<div class="stat-label">% Uptime</div>
				</div>
			</div>
		</div>
	</div>
</div>

<style>
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

	.floating-elements {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		z-index: 1;
		pointer-events: none;
	}

	/* Enhanced particle system */
	.particle {
		position: absolute;
		background: rgba(255, 255, 255, 0.6);
		border-radius: 50%;
		pointer-events: none;
		animation: particleFloat 3s ease-in-out infinite;
	}

	@keyframes particleFloat {
		0%, 100% { transform: translateY(0px) scale(1); }
		50% { transform: translateY(-10px) scale(1.1); }
	}

	/* Interactive animated shapes */
	.animated-shape {
		position: absolute;
		pointer-events: none;
		animation: shapeFloat 4s ease-in-out infinite;
		transition: transform 0.3s ease;
	}

	.animated-shape.circle {
		background: rgba(255, 255, 255, 0.1);
		border-radius: 50%;
		border: 2px solid rgba(255, 255, 255, 0.2);
	}

	.animated-shape.square {
		background: rgba(255, 255, 255, 0.1);
		border: 2px solid rgba(255, 255, 255, 0.2);
		border-radius: 8px;
	}

	.animated-shape.triangle,
	.animated-shape.hexagon {
		color: rgba(255, 255, 255, 0.2);
	}

	.shape-svg {
		width: 100%;
		height: 100%;
	}

	@keyframes shapeFloat {
		0%, 100% { transform: translateY(0px) rotate(0deg); }
		50% { transform: translateY(-15px) rotate(180deg); }
	}

	/* Enhanced floating cards with icons */
	.floating-card {
		position: absolute;
		background: rgba(255, 255, 255, 0.15);
		border-radius: 20px;
		backdrop-filter: blur(15px);
		border: 1px solid rgba(255, 255, 255, 0.3);
		display: flex;
		align-items: center;
		justify-content: center;
		transition: all 0.3s ease;
	}

	.floating-card:hover {
		background: rgba(255, 255, 255, 0.2);
		transform: scale(1.05);
	}

	.card-icon {
		width: 60%;
		height: 60%;
		color: rgba(255, 255, 255, 0.8);
		animation: iconPulse 2s ease-in-out infinite;
	}

	@keyframes iconPulse {
		0%, 100% { opacity: 0.8; transform: scale(1); }
		50% { opacity: 1; transform: scale(1.1); }
	}

	.card-1 {
		width: 120px;
		height: 80px;
		top: 15%;
		left: 8%;
		animation: float 6s ease-in-out infinite;
	}

	.card-2 {
		width: 100px;
		height: 100px;
		top: 55%;
		right: 12%;
		animation: float 8s ease-in-out infinite reverse;
	}

	.card-3 {
		width: 80px;
		height: 120px;
		bottom: 25%;
		left: 15%;
		animation: float 7s ease-in-out infinite;
	}

	.card-4 {
		width: 90px;
		height: 90px;
		top: 25%;
		right: 25%;
		animation: float 9s ease-in-out infinite;
	}

	.card-5 {
		width: 110px;
		height: 70px;
		bottom: 15%;
		right: 8%;
		animation: float 5s ease-in-out infinite reverse;
	}

	@keyframes float {
		0%, 100% { transform: translateY(0px) rotate(0deg); }
		50% { transform: translateY(-25px) rotate(5deg); }
	}

	/* Decorative SVG elements */
	.decorative-element {
		position: absolute;
		pointer-events: none;
		animation: decorativeFloat 10s ease-in-out infinite;
	}

	.deco-1 {
		width: 200px;
		height: 200px;
		top: 10%;
		right: 5%;
		animation-delay: -2s;
	}

	.deco-2 {
		width: 150px;
		height: 150px;
		bottom: 20%;
		left: 5%;
		animation-delay: -4s;
	}

	.deco-3 {
		width: 120px;
		height: 120px;
		top: 40%;
		left: 3%;
		animation-delay: -6s;
	}

	.deco-svg {
		width: 100%;
		height: 100%;
		opacity: 0.3;
	}

	@keyframes decorativeFloat {
		0%, 100% { transform: translateY(0px) rotate(0deg); opacity: 0.3; }
		50% { transform: translateY(-20px) rotate(10deg); opacity: 0.5; }
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

	/* Enhanced title with word animation */
	.title {
		font-size: clamp(3rem, 8vw, 6rem);
		font-weight: 800;
		color: white;
		margin-bottom: 1rem;
		text-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
		letter-spacing: -2px;
		display: flex;
		justify-content: center;
		gap: 0.2em;
	}

	.title-word {
		display: inline-block;
		animation: titleSlideIn 1s ease-out forwards;
		opacity: 0;
		transform: translateY(50px);
	}

	@keyframes titleSlideIn {
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	.subtitle {
		font-size: clamp(1.2rem, 3vw, 1.5rem);
		color: rgba(255, 255, 255, 0.9);
		margin-bottom: 3rem;
		font-weight: 300;
		line-height: 1.6;
		animation: fadeInUp 1s ease-out 0.5s forwards;
		opacity: 0;
		transform: translateY(30px);
	}

	@keyframes fadeInUp {
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	.input-container {
		background: rgba(255, 255, 255, 0.15);
		backdrop-filter: blur(20px);
		border-radius: 25px;
		padding: 1.5rem;
		margin-bottom: 3rem;
		border: 1px solid rgba(255, 255, 255, 0.2);
		box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
		position: relative;
		z-index: 15;
		animation: fadeInUp 1s ease-out 0.7s forwards;
		opacity: 0;
		transform: translateY(30px);
	}

	.name-input {
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

	.name-input:focus {
		background: white;
		box-shadow: 0 5px 20px rgba(0, 0, 0, 0.1);
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
		box-shadow: 0 5px 20px rgba(0, 0, 0, 0.1);
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

	.toggle-api-visibility:hover {
		background: rgba(0, 0, 0, 0.05);
		color: #374151;
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

	.api-info {
		background: rgba(255, 255, 255, 0.1);
		padding: 1rem;
		border-radius: 15px;
		margin-top: 1rem;
		font-size: 0.85rem;
		color: rgba(255, 255, 255, 0.9);
		border: 1px solid rgba(255, 255, 255, 0.1);
	}

	.api-info p {
		margin: 0.5rem 0;
	}

	.api-info a {
		color: #60a5fa;
		text-decoration: none;
		font-weight: 600;
	}

	.api-info a:hover {
		text-decoration: underline;
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

	/* Enhanced start button with arrow icon */
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
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
	}

	.button-arrow {
		width: 20px;
		height: 20px;
		transition: transform 0.3s ease;
	}

	.start-button:hover:not(:disabled) {
		transform: translateY(-3px);
		box-shadow: 0 15px 35px rgba(238, 90, 36, 0.4);
	}

	.start-button:hover:not(:disabled) .button-arrow {
		transform: translateX(5px);
	}

	.start-button:disabled {
		opacity: 0.6;
		cursor: not-allowed;
		transform: none;
		box-shadow: none;
	}

	/* Enhanced features with glow effects */
	.features-preview {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
		gap: 1.5rem;
		max-width: 500px;
		margin: 0 auto 3rem;
		animation: fadeInUp 1s ease-out 0.9s forwards;
		opacity: 0;
		transform: translateY(30px);
	}

	.feature-item {
		background: rgba(255, 255, 255, 0.1);
		backdrop-filter: blur(10px);
		border-radius: 15px;
		padding: 1.5rem 1rem;
		border: 1px solid rgba(255, 255, 255, 0.2);
		transition: all 0.3s ease;
		color: white;
		position: relative;
		overflow: hidden;
		animation: featureSlideIn 0.8s ease-out forwards;
		opacity: 0;
		transform: translateY(50px);
	}

	@keyframes featureSlideIn {
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	.feature-item:hover {
		transform: translateY(-5px);
		background: rgba(255, 255, 255, 0.15);
	}

	.feature-glow {
		position: absolute;
		top: -50%;
		left: -50%;
		width: 200%;
		height: 200%;
		background: radial-gradient(circle, rgba(255, 255, 255, 0.1) 0%, transparent 70%);
		opacity: 0;
		transition: opacity 0.3s ease;
		pointer-events: none;
	}

	.feature-item:hover .feature-glow {
		opacity: 1;
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
		transition: all 0.3s ease;
	}

	.feature-item:hover .feature-icon {
		background: rgba(255, 255, 255, 0.2);
		transform: scale(1.1);
	}

	.feature-icon svg {
		width: 24px;
		height: 24px;
		stroke: currentColor;
		stroke-width: 2;
		fill: none;
	}

	/* Added interactive stats section */
	.stats-section {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 2rem;
		max-width: 400px;
		margin: 0 auto;
		animation: fadeInUp 1s ease-out 1.1s forwards;
		opacity: 0;
		transform: translateY(30px);
	}

	.stat-item {
		text-align: center;
		color: white;
		background: rgba(255, 255, 255, 0.1);
		backdrop-filter: blur(10px);
		border-radius: 15px;
		padding: 1.5rem 1rem;
		border: 1px solid rgba(255, 255, 255, 0.2);
		transition: all 0.3s ease;
	}

	.stat-item:hover {
		transform: translateY(-5px);
		background: rgba(255, 255, 255, 0.15);
	}

	.stat-number {
		font-size: 2rem;
		font-weight: 800;
		margin-bottom: 0.5rem;
		background: linear-gradient(135deg, #fff 0%, rgba(255, 255, 255, 0.8) 100%);
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
	}

	.stat-label {
		font-size: 0.9rem;
		opacity: 0.9;
		font-weight: 500;
	}

	@media (max-width: 768px) {
		.features-preview {
			grid-template-columns: repeat(2, 1fr);
			gap: 1rem;
		}

		.stats-section {
			grid-template-columns: repeat(3, 1fr);
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

		/* Hide some decorative elements on mobile for performance */
		.decorative-element,
		.animated-shape {
			display: none;
		}

		.particle {
			display: none;
		}

		.floating-card.card-4,
		.floating-card.card-5 {
			display: none;
		}
	}
</style>
