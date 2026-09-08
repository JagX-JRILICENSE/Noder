"""Noder Pygame template — classic Snake (desktop window, not browser)."""
import random
import sys

try:
    import pygame
except ImportError:
    print("Install pygame first:  pip install pygame")
    sys.exit(1)

CELL = 20
COLS, ROWS = 32, 24
WIDTH, HEIGHT = COLS * CELL, ROWS * CELL
FPS = 12

BLACK = (18, 18, 22)
GREEN = (0, 212, 170)
DARK = (0, 140, 110)
RED = (244, 67, 54)
WHITE = (230, 230, 230)


def main() -> None:
    pygame.init()
    screen = pygame.display.set_mode((WIDTH, HEIGHT))
    pygame.display.set_caption("Noder Snake — JagX & JRILICENSE")
    clock = pygame.time.Clock()
    font = pygame.font.SysFont("consolas", 18)

    snake = [(COLS // 2, ROWS // 2)]
    direction = (1, 0)
    food = random_empty(snake)
    score = 0
    alive = True

    while True:
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                pygame.quit()
                return
            if event.type == pygame.KEYDOWN:
                if event.key in (pygame.K_UP, pygame.K_w) and direction != (0, 1):
                    direction = (0, -1)
                elif event.key in (pygame.K_DOWN, pygame.K_s) and direction != (0, -1):
                    direction = (0, 1)
                elif event.key in (pygame.K_LEFT, pygame.K_a) and direction != (1, 0):
                    direction = (-1, 0)
                elif event.key in (pygame.K_RIGHT, pygame.K_d) and direction != (-1, 0):
                    direction = (1, 0)
                elif event.key == pygame.K_r and not alive:
                    snake = [(COLS // 2, ROWS // 2)]
                    direction = (1, 0)
                    food = random_empty(snake)
                    score = 0
                    alive = True

        if alive:
            head = (snake[0][0] + direction[0], snake[0][1] + direction[1])
            if (
                head[0] < 0
                or head[0] >= COLS
                or head[1] < 0
                or head[1] >= ROWS
                or head in snake
            ):
                alive = False
            else:
                snake.insert(0, head)
                if head == food:
                    score += 1
                    food = random_empty(snake)
                else:
                    snake.pop()

        screen.fill(BLACK)
        for i, (x, y) in enumerate(snake):
            color = GREEN if i == 0 else DARK
            pygame.draw.rect(screen, color, (x * CELL, y * CELL, CELL - 1, CELL - 1))
        pygame.draw.rect(screen, RED, (food[0] * CELL, food[1] * CELL, CELL - 1, CELL - 1))

        label = font.render(f"Score: {score}" + ("  — R to restart" if not alive else ""), True, WHITE)
        screen.blit(label, (8, 6))
        pygame.display.flip()
        clock.tick(FPS)


def random_empty(snake):
    while True:
        p = (random.randint(0, COLS - 1), random.randint(0, ROWS - 1))
        if p not in snake:
            return p


if __name__ == "__main__":
    main()
