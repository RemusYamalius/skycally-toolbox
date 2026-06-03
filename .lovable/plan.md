## Pinball — fix blocked plunger lane and weak launch

The ball cannot leave the plunger lane because two walls close it off at the top, and the launch velocity is too low to reach the upper playfield even when the path is open.

### Root causes

1. **Plunger lane wall** is drawn from `(W-28, 8)` to `(W-28, H-130)` — solid all the way to the top, so a ball rising through the lane has nowhere to exit into the playfield.
2. **Right guide slope** goes from `(W-8, H-200)` to `(W-130, H-80)`. Its top point sits at `x = W-8`, which is *inside* the plunger lane (lane spans `x > W-28`). A ball moving up the lane hits this slope around `y ≈ H-190` and bounces straight back down.
3. **Launch impulse** is `vy = -(7 + charge*7)` (max `-14`), and `MAX_SPEED = 16`. Max climb height with gravity `0.32` is `v²/(2g) ≈ 306px`, far short of the ~560px needed to reach the top bumpers.

### Changes in `src/routes/tools.pinball.tsx`

1. **Open the top of the plunger lane (drawing, ~line 774-777)**: change the wall to start at `y = 70` instead of `y = 8`, leaving a ~70px gap at the top for the ball to arc over into the playfield.

2. **Move the right guide slope out of the lane (drawing, ~line 784)**: change endpoints from `(W-8, H-200) → (W-130, H-80)` to `(W-30, H-130) → (W-130, H-80)`. The slope now starts at the inner edge of the lane wall (just below where the lane wall ends), so it guides balls down to the right flipper without intruding into the plunger lane.

3. **Update the matching collision segment (~line 550)**: pass the new endpoints `(W-30, H-130, W-130, H-80)` to `reflectCircleSegment` so collisions match the drawn geometry.

4. **Update the lane-wall collision (~line 532-540)**: also require `ball.y > 70` so the wall only blocks within the drawn portion, allowing balls to cross over the top opening from either side.

5. **Stronger launch (~line 910 and ~line 948)**:
   - Keyboard launch: `ball.vy = -(11 + charge*8)` (range ~13..19).
   - Mobile tap launch: `ball.vy = -18`.
6. **Raise speed cap (~line 51)**: `MAX_SPEED = 20` so the per-step cap doesn't immediately throttle the launch back down. Bumper kick and gravity already self-regulate normal play.

No other game logic, scoring, audio, theme, or layout changes.