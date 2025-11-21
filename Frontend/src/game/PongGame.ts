export class PongGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private running: boolean = false;
  private animationId: number = 0;

  // Game objects
  private ball = { x: 400, y: 300, radius: 10, dx: 5, dy: 5, speed: 5 };
  private paddle1 = { x: 10, y: 250, width: 10, height: 100, score: 0 };
  private paddle2 = { x: 780, y: 250, width: 10, height: 100, score: 0 };
  
  // Input state
  private keys: { [key: string]: boolean } = {};

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    
    // Bind input events
    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleKeyUp = this.handleKeyUp.bind(this);
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
  }

  private handleKeyDown(e: KeyboardEvent) {
    this.keys[e.key] = true;
  }

  private handleKeyUp(e: KeyboardEvent) {
    this.keys[e.key] = false;
  }

  public start() {
    if (!this.running) {
      this.running = true;
      this.loop();
    }
  }

  public stop() {
    this.running = false;
    cancelAnimationFrame(this.animationId);
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
  }

  private resetBall() {
    this.ball.x = this.canvas.width / 2;
    this.ball.y = this.canvas.height / 2;
    this.ball.dx = -this.ball.dx; // Serve to the other player
    this.ball.speed = 5;
  }

  private update() {
    // Paddle movement
    const paddleSpeed = 8;
    
    // Player 1 (W/S)
    if (this.keys['w'] || this.keys['W']) {
      this.paddle1.y = Math.max(0, this.paddle1.y - paddleSpeed);
    }
    if (this.keys['s'] || this.keys['S']) {
      this.paddle1.y = Math.min(this.canvas.height - this.paddle1.height, this.paddle1.y + paddleSpeed);
    }

    // Player 2 (Arrow Up/Down)
    if (this.keys['ArrowUp']) {
      this.paddle2.y = Math.max(0, this.paddle2.y - paddleSpeed);
    }
    if (this.keys['ArrowDown']) {
      this.paddle2.y = Math.min(this.canvas.height - this.paddle2.height, this.paddle2.y + paddleSpeed);
    }

    // Ball movement
    this.ball.x += this.ball.dx;
    this.ball.y += this.ball.dy;

    // Wall collision (Top/Bottom)
    if (this.ball.y - this.ball.radius < 0 || this.ball.y + this.ball.radius > this.canvas.height) {
      this.ball.dy = -this.ball.dy;
    }

    // Paddle collision
    // Player 1
    if (
      this.ball.x - this.ball.radius < this.paddle1.x + this.paddle1.width &&
      this.ball.y > this.paddle1.y &&
      this.ball.y < this.paddle1.y + this.paddle1.height
    ) {
      this.ball.dx = Math.abs(this.ball.dx); // Bounce right
      this.ball.speed += 0.5; // Increase speed
    }

    // Player 2
    if (
      this.ball.x + this.ball.radius > this.paddle2.x &&
      this.ball.y > this.paddle2.y &&
      this.ball.y < this.paddle2.y + this.paddle2.height
    ) {
      this.ball.dx = -Math.abs(this.ball.dx); // Bounce left
      this.ball.speed += 0.5;
    }

    // Scoring
    if (this.ball.x < 0) {
      this.paddle2.score++;
      this.resetBall();
    } else if (this.ball.x > this.canvas.width) {
      this.paddle1.score++;
      this.resetBall();
    }
  }

  private draw() {
    // Clear canvas
    this.ctx.fillStyle = 'black';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw net
    this.ctx.strokeStyle = 'white';
    this.ctx.setLineDash([5, 15]);
    this.ctx.beginPath();
    this.ctx.moveTo(this.canvas.width / 2, 0);
    this.ctx.lineTo(this.canvas.width / 2, this.canvas.height);
    this.ctx.stroke();
    this.ctx.setLineDash([]);

    // Draw paddles
    this.ctx.fillStyle = 'white';
    this.ctx.fillRect(this.paddle1.x, this.paddle1.y, this.paddle1.width, this.paddle1.height);
    this.ctx.fillRect(this.paddle2.x, this.paddle2.y, this.paddle2.width, this.paddle2.height);

    // Draw ball
    this.ctx.beginPath();
    this.ctx.arc(this.ball.x, this.ball.y, this.ball.radius, 0, Math.PI * 2);
    this.ctx.fill();

    // Draw scores
    this.ctx.font = '48px monospace';
    this.ctx.fillText(this.paddle1.score.toString(), this.canvas.width / 4, 50);
    this.ctx.fillText(this.paddle2.score.toString(), 3 * this.canvas.width / 4, 50);
  }

  private loop() {
    if (!this.running) return;

    this.update();
    this.draw();

    this.animationId = requestAnimationFrame(() => this.loop());
  }
}
