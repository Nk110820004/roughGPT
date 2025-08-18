<script>
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';

	let { data } = $props();
	let userName = $state('');
	let showWelcome = $state(true);

	function startApp() {
		if (userName.trim()) {
			localStorage.setItem('userName', userName);
			goto('/workspace');
		}
	}

	onMount(() => {
		const savedName = localStorage.getItem('userName');
		if (savedName) {
			goto('/workspace');
		}
	});
</script>

<div class="welcome-container">
	<div class="hero-section">
		<div class="floating-elements">
			<div class="floating-card card-1"></div>
			<div class="floating-card card-2"></div>
			<div class="floating-card card-3"></div>
		</div>
		
		<div class="main-content">
			<h1 class="title">TaskFlow</h1>
			<p class="subtitle">Your beautiful, organized workspace for everything</p>
			
			<div class="input-container">
				<input
					type="text"
					placeholder="What's your name?"
					bind:value={userName}
					class="name-input"
					onkeypress={(e) => e.key === 'Enter' && startApp()}
				/>
				<button class="start-button" onclick={startApp} disabled={!userName.trim()}>
					Get Started
				</button>
			</div>
			
			<div class="features-preview">
				<div class="feature-item">
					<div class="feature-icon">
						<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
							<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z"/>
							<path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/>
						</svg>
					</div>
					<span>Rich Text Editing</span>
				</div>
				<div class="feature-item">
					<div class="feature-icon">
						<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
							<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
						</svg>
					</div>
					<span>Organize & Categorize</span>
				</div>
				<div class="feature-item">
					<div class="feature-icon">
						<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
							<circle cx="11" cy="11" r="8"/>
							<path d="m21 21-4.35-4.35"/>
						</svg>
					</div>
					<span>Powerful Search</span>
				</div>
				<div class="feature-item">
					<div class="feature-icon">
						<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
							<rect x="5" y="2" width="14" height="20" rx="2" ry="2"/>
							<line x1="12" y1="18" x2="12.01" y2="18"/>
						</svg>
					</div>
					<span>Responsive Design</span>
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
	}

	.floating-card {
		position: absolute;
		background: rgba(255, 255, 255, 0.1);
		border-radius: 20px;
		backdrop-filter: blur(10px);
		border: 1px solid rgba(255, 255, 255, 0.2);
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
		z-index: 2;
		text-align: center;
		max-width: 600px;
		padding: 2rem;
		margin: 0 auto;
		width: 100%;
		box-sizing: border-box;
	}

	.title {
		font-size: clamp(3rem, 8vw, 6rem);
		font-weight: 800;
		color: white;
		margin-bottom: 1rem;
		text-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
		letter-spacing: -2px;
	}

	.subtitle {
		font-size: clamp(1.2rem, 3vw, 1.5rem);
		color: rgba(255, 255, 255, 0.9);
		margin-bottom: 3rem;
		font-weight: 300;
		line-height: 1.6;
	}

	.input-container {
		background: rgba(255, 255, 255, 0.15);
		backdrop-filter: blur(20px);
		border-radius: 25px;
		padding: 1.5rem;
		margin-bottom: 3rem;
		border: 1px solid rgba(255, 255, 255, 0.2);
		box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
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
	}

	.name-input:focus {
		background: white;
		box-shadow: 0 5px 20px rgba(0, 0, 0, 0.1);
		transform: translateY(-2px);
	}

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
	}

	.start-button:hover:not(:disabled) {
		transform: translateY(-3px);
		box-shadow: 0 15px 35px rgba(238, 90, 36, 0.4);
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
		background: rgba(255, 255, 255, 0.1);
		backdrop-filter: blur(10px);
		border-radius: 15px;
		padding: 1.5rem 1rem;
		border: 1px solid rgba(255, 255, 255, 0.2);
		transition: all 0.3s ease;
		color: white;
	}

	.feature-item:hover {
		transform: translateY(-5px);
		background: rgba(255, 255, 255, 0.15);
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
	}

	.feature-icon svg {
		width: 24px;
		height: 24px;
		stroke: currentColor;
		stroke-width: 2;
		fill: none;
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
	}
</style>
