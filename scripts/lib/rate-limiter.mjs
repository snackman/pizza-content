/**
 * Rate Limiter with Exponential Backoff
 *
 * Manages API request rates to avoid hitting rate limits.
 * Supports exponential backoff on 429 errors.
 */

export class RateLimiter {
  constructor(options = {}) {
    this.requestsPerMinute = options.requestsPerMinute || 30
    this.minInterval = (60 * 1000) / this.requestsPerMinute // ms between requests
    this.maxRetries = options.maxRetries || 5
    this.baseDelay = options.baseDelay || 1000 // 1 second
    this.maxDelay = options.maxDelay || 60000 // 60 seconds

    this.lastRequestTime = 0
    this.requestCount = 0
    this.windowStart = Date.now()
  }

  /**
   * Wait until it's safe to make another request
   */
  async waitForSlot() {
    const now = Date.now()

    // Reset window if a minute has passed
    if (now - this.windowStart >= 60000) {
      this.windowStart = now
      this.requestCount = 0
    }

    // Check if we've hit the rate limit for this window
    if (this.requestCount >= this.requestsPerMinute) {
      const waitTime = 60000 - (now - this.windowStart)
      if (waitTime > 0) {
        console.log(`[RateLimiter] Rate limit reached, waiting ${Math.ceil(waitTime / 1000)}s...`)
        await this.sleep(waitTime)
        this.windowStart = Date.now()
        this.requestCount = 0
      }
    }

    // Ensure minimum interval between requests
    const timeSinceLastRequest = now - this.lastRequestTime
    if (timeSinceLastRequest < this.minInterval) {
      await this.sleep(this.minInterval - timeSinceLastRequest)
    }

    this.lastRequestTime = Date.now()
    this.requestCount++
  }

  /**
   * Execute a function with rate limiting and retry logic
   */
  async execute(fn, context = 'request') {
    let lastError

    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      await this.waitForSlot()

      try {
        return await fn()
      } catch (error) {
        lastError = error

        // Check for rate limit error (429)
        const isRateLimited =
          error.status === 429 ||
          error.statusCode === 429 ||
          error.message?.includes('429') ||
          error.message?.toLowerCase().includes('rate limit')

        if (isRateLimited) {
          const delay = this.calculateBackoff(attempt)
          console.log(`[RateLimiter] ${context}: Rate limited (attempt ${attempt + 1}/${this.maxRetries}), backing off ${Math.ceil(delay / 1000)}s...`)
          await this.sleep(delay)
        } else {
          // Non-rate-limit error, throw immediately
          throw error
        }
      }
    }

    throw new Error(`${context}: Max retries (${this.maxRetries}) exceeded. Last error: ${lastError?.message}`)
  }

  /**
   * Calculate exponential backoff delay
   */
  calculateBackoff(attempt) {
    // Exponential backoff: 2^attempt * baseDelay with jitter
    const exponentialDelay = Math.min(
      this.maxDelay,
      Math.pow(2, attempt) * this.baseDelay
    )
    // Add jitter (0-25% of the delay)
    const jitter = exponentialDelay * Math.random() * 0.25
    return exponentialDelay + jitter
  }

  /**
   * Sleep helper
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Reset the rate limiter state
   */
  reset() {
    this.lastRequestTime = 0
    this.requestCount = 0
    this.windowStart = Date.now()
  }
}

export default RateLimiter
