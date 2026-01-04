Senior Prompt Engineer AI Agent: Visual Generation Frameworks

This document provides a comprehensive technical summary of visual generation principles, structured for vector embedding to power a Senior Prompt Engineer AI Agent. The information is distilled into technical vocabularies, logic rules, and prompt structures to translate marketing concepts into precise visual outputs for DALL-E 3 and Runway Gen-3.

1. "The Filmmaker's Handbook": Cinematography
Visual Vocabulary Cheat Sheet

Lighting:

Three-Point Lighting: Standard professional setup (Key, Fill, Backlight) for a clean, dimensional look.

High-Key Lighting: Bright, low-contrast, minimal shadows. Evokes positivity, cleanliness, and optimism.

Low-Key Lighting: High-contrast, dark tones, deep shadows. Evokes drama, mystery, seriousness, and tension.

Rembrandt Lighting: A specific low-key style creating a triangle of light on the cheek. Highly dramatic and artistic.

Golden Hour: Soft, warm, diffused light shortly after sunrise or before sunset. Evokes warmth, romance, nostalgia.

Blue Hour: Cool, soft, diffused light just before sunrise or after sunset. Evokes serenity, cold, or melancholy.

Volumetric Lighting: Visible light rays/beams (e.g., light through a dusty window). Adds depth and atmosphere.

Hard Lighting: Creates sharp, well-defined shadows. Intense and dramatic.

Softbox Lighting: Mimics diffuse, soft light from a large source. Flattering for portraits, clean product shots.

Neon Lighting: Use of neon signs and colors. Evokes cyberpunk, nightlife, urban, and retro aesthetics.

Camera & Lens:

Shot Type: Wide Shot, Full Shot, Medium Shot, Close-up, Extreme Close-up.

Angle: Eye-Level, Low Angle (powerful), High Angle (vulnerable), Dutch Angle (disorienting), Bird's-Eye View, Worm's-Eye View.

Lens Type:

Wide-Angle Lens (e.g., 24mm): Captures a broad field of view, can distort edges. Used for landscapes, establishing shots.

Telephoto Lens (e.g., 85mm, 200mm): Compresses depth, isolates subject. Used for portraits, sports, wildlife.

Macro Lens: For extreme close-ups, revealing fine details.

Prime Lens (e.g., 50mm f/1.8): Fixed focal length, often sharper with better low-light performance.

Composition & Focus:

Rule of Thirds: Placing key elements on intersecting grid lines.

Leading Lines: Using natural lines to guide the viewer's eye.

Depth of Field (DoF): The zone of acceptable sharpness.

Shallow Depth of Field / Bokeh (e.g., f/1.4, f/1.8): Blurs the background, isolates the subject. Creates a professional, cinematic feel.

Deep Depth of Field (e.g., f/11, f/22): Keeps both foreground and background sharp. Used for landscapes.

"If... Then..." Logic Rules for Visuals

IF the goal is to make the subject (person or product) appear heroic, powerful, or dominant, THEN use a Low Angle Shot with Hard Lighting.

IF the brand identity is clean, minimalist, and modern (e.g., Apple), THEN use High-Key Lighting or Softbox Lighting with a Deep Depth of Field.

IF the mood is nostalgic, romantic, or serene, THEN specify Golden Hour Lighting with a Telephoto Lens and Shallow Depth of Field (Bokeh).

IF the product is food, jewelry, or has intricate details, THEN use a Macro Lens, Shallow Depth of Field, and High Contrast to emphasize texture.

IF the scene is meant to be dramatic, mysterious, or serious, THEN use Low-Key Lighting, Rembrandt Lighting, and a cool color palette.

IF creating an establishing shot for a location, THEN use a Wide-Angle Lens from a High Angle or Bird's-Eye View.

2. DALL-E 3 & Image Model Documentation
Visual Vocabulary Cheat Sheet

Prompt Structure: DALL-E 3 prefers conversational, descriptive sentences. The most critical elements should be mentioned first.

Aspect Ratios (AR): --ar 16:9 (Cinematic), --ar 9:16 (Social Media Stories), --ar 1:1 (Square/Instagram Feed), --ar 4:3 (Standard).

Stylization Keywords:

Medium: photograph, cinematic film still, digital art, vector illustration, 3D render, oil painting.

Detail Level: hyper-detailed, 8k, UHD, photorealistic, minimalist, flat design.

Artist Influence: in the style of [Artist Name] (e.g., Ansel Adams for B&W landscapes, Wes Anderson for symmetry).

Weighting: While not a formal parameter in DALL-E 3, emphasis can be added by placing terms at the beginning of the prompt or using descriptive adjectives (e.g., "A photo of a majestic, bright red sports car...").

"If... Then..." Logic Rules for Visuals

IF the output needs to fit an Instagram Story or TikTok video, THEN specify the prompt must end with --ar 9:16.

IF the desired output is a logo or icon, THEN the prompt must include vector logo, flat design, minimalist, on a solid white background.

IF the prompt is for a food product, THEN add keywords like professional food photography, tantalizing, glistening, steam rising.

IF a photorealistic output is required, THEN start the prompt with Photorealistic image of... or Cinematic film still of... and include specific camera/lens details.

IF the AI is misinterpreting the subject, THEN simplify the prompt to focus only on the core subject and action, then iteratively add stylistic details.

3. Runway Gen-3 Camera Control
Visual Vocabulary Cheat Sheet

Global Motion Commands: Affects the entire frame.

Pan: pan left, pan right (Horizontal camera rotation).

Tilt: tilt up, tilt down (Vertical camera rotation).

Roll: roll clockwise, roll counter-clockwise (Rotates on the Z-axis).

Zoom: zoom in, zoom out.

Truck: truck left, truck right (Moves the entire camera horizontally).

Dolly: dolly in, dolly out (Moves the entire camera forward/backward, similar to zoom but changes perspective).

Motion Scale: Controls the intensity of the motion, specified from 1 (subtle) to 10 (extreme). Example: pan right at motion scale 8.

Motion Brush: An advanced tool to paint over specific areas of the image to add localized motion. Allows for complex effects like a static character with wind-blown hair.

"If... Then..." Logic Rules for Visuals

IF revealing a wide landscape or panoramic view, THEN use a slow pan left at motion scale 2.

IF creating a feeling of unease or disorientation, THEN use a slow roll clockwise at motion scale 1.

IF emphasizing a subject's speed (e.g., a running car), THEN combine a truck right at motion scale 7 with the text prompt motion blur, high shutter speed.

IF creating a dramatic focus pull on a character's face, THEN use a slow dolly in at motion scale 3.

IF showing a product on a pedestal, THEN keep the camera static and use Motion Brush on the background to create a subtle parallax effect.

IF the video output is too fast and jittery, THEN reduce the motion scale to a value between 1 and 4.

4. Stable Diffusion Art Styles & Renders
Visual Vocabulary Cheat Sheet

Rendering Engines: These keywords dictate the lighting, texture, and realism of the output.

Unreal Engine 5: Photorealistic, cinematic, often used for game-like or architectural visuals. High-quality global illumination.

Octane Render: Hyper-realistic, path-traced renderer known for physically accurate lighting, reflections, and refractions. Great for product shots.

V-Ray: Professional-grade renderer used in film and design. Excellent for realistic materials.

Redshift: GPU-accelerated renderer known for speed and stylized realism.

Specific Art Styles:

Cyberpunk: High-tech, low-life, neon-drenched, dystopian urban environments.

Steampunk: Retrofuturistic aesthetic inspired by 19th-century steam-powered machinery.

Solarpunk: An optimistic, eco-friendly future aesthetic with lush greenery integrated into architecture.

Biopunk: Focuses on biotechnology, genetic engineering, and organic-mechanical hybrids.

Vaporwave: Retro aesthetic from the 80s/90s, with pastel colors, glitch art, and classical statues.

Bauhaus: Minimalist, geometric, focuses on the relationship between form and function.

Ghibli Style: Emulates the hand-drawn, whimsical, and lush painterly style of Studio Ghibli films.

"If... Then..." Logic Rules for Visuals

IF the product is a high-tech gadget or software, THEN use rendered in Unreal Engine 5 or Octane Render with a Cyberpunk or Minimalist aesthetic.

IF the brand is sustainable or nature-focused, THEN use the Solarpunk style with natural volumetric lighting.

IF the goal is a premium, luxurious product shot (e.g., a watch, perfume), THEN the prompt must include Octane Render, studio lighting, hyper-detailed, 8k, professional product shot.

IF the campaign requires a friendly, animated feel, THEN specify Ghibli style, digital painting, whimsical.

IF creating architectural visualizations, THEN use Unreal Engine 5 render, architectural digest, photorealistic.

The Anatomy of a Perfect Prompt

A perfect prompt is a hierarchical instruction set. The formula is an additive chain of descriptive tokens.

[Medium] of a [Subject] + [Action/Pose] in a [Environment] during [Time of Day]. [Composition/Framing Details]. Lit by [Lighting Style]. [Camera Shot/Angle] with a [Lens Type] creating a [Depth of Field Effect]. STYLE: [Art Style], [Rendering Engine], [Artist Influence], [Technical Specs]. --ar [Aspect Ratio]

Example (Image):
Cinematic film still of a female astronaut gazing out a spaceship window at a swirling nebula. Close-up shot, framed using the rule of thirds. Lit by the soft, purple neon glow from the control panel and volumetric light rays from the nebula. Shot on an 85mm prime lens with a shallow depth of field, f/1.8, creating beautiful bokeh. STYLE: Hyper-realistic, Octane Render, in the style of Blade Runner 2049, 8k, hyper-detailed. --ar 16:9

Example (Video):
[Use Image Prompt Above]. Motion: slow zoom in at motion scale 2.

Negative Prompts List

A universal list of terms to add to a "negative prompt" parameter to improve quality and coherence.

General Quality: low quality, low resolution, bad, ugly, jpeg artifacts, blurry, noisy, pixelated, amateur, watermark, signature, text, username

Anatomy & Form: deformed, disfigured, distorted, malformed, mutated, extra limbs, missing limbs, fused fingers, too many fingers, long neck, bad anatomy, bad proportions, cloned face

Composition: tiling, poorly drawn, out of frame, cropped, cut off

Video Specific: flickering, stuttering, warping, morphing, inconsistent lighting, glitching