# Abbaye de Mort (The Abbey of Death)

A story-driven, atmospheric 3D First-Person Shooter built purely for static HTML hosting (such as GitHub Pages) with **zero external dependencies and zero build step**—powered by WebGL2, procedural Canvas textures, and real-time Web Audio synthesis.

## Storyline

Central France, November 1943—on the border of Free France territory. Perched atop a sheer **100-meter limestone outcrop** stands the ruined **Abbaye de Mort**.

1. **Act I — The Outcrop of Death**: English SOE spy Alistair Finch flees across the Free France border with stolen German troop-movement charts, fighting past a Wehrmacht patrol into the Abbey Gatehouse.
2. **Act II — The Last Monk & The Wireless**: Meet **Abbot Henri**, the last soul left in the ruins, operating a secret British B2 shortwave radio. Recover his hidden MAS-36 rifle and transmit the charts to London—just as German direction-finders pinpoint the Abbey.
3. **Act III — Room by Room**: Overwhelming German forces storm the Gatehouse. Fight room by room across the Courtyard, Grand Nave, and West Cloister corridors as the iron portcullis slams shut and your ammunition runs dangerously low.
4. **Act IV — The Hundred-Meter Flank**: Crimson signal flares erupt from the sheer **100-meter East cliff face**—French Resistance (Maquis) fighters scale the unguarded rock wall to ambush the German rear and deliver a **Sten Mk II SMG** and fresh ammunition.
5. **Act V — Forty-Eight Hours to Dawn**: London confirms British 1st Airborne paratroopers are inbound (ETA 48 hours). Hold Abbaye de Mort alongside Abbot Henri and the Maquis as night storm transitions into golden French dawn and C-47 Dakotas fill the sky with silk parachutes.

## Controls

- **Move**: `W` `A` `S` `D`
- **Look**: Mouse (click screen to lock pointer) — or Arrow Keys / `Q` for trackpad-friendly play
- **Fire**: Left Click or `Space`
- **Aim Down Sights**: Right Click or `Shift`
- **Reload**: `R`
- **Switch Weapons**: `1` (Webley Revolver), `2` (MAS-36 Rifle), `3` (Sten Mk II SMG), or Mouse Wheel
- **Interact (Radio, Weapon Racks, Resupply Crates, Field Lore)**: `E` or `F`
- **Intelligence Dossier & Live Abbey Map**: `Tab` or `M`
- **Pause & Settings**: `P`

## Hosting on GitHub Pages

No build tools or `npm install` needed:
1. Push the repository contents to GitHub.
2. Go to **Settings → Pages** and select your branch root (`/`) as the source.
3. Open your published static site URL in any modern WebGL2-capable browser.

To test locally, serve the folder with any static HTTP server:
```sh
python3 -m http.server 8080
```
Then visit `http://localhost:8080`.
