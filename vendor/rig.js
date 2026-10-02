// מנוע ריג שכבות: שלד היררכי, קליפים עם אינטרפולציה, ומעבר רך בין תנועות.
//
// המנוע אינו יודע דבר על המשחק ואינו נוגע ב-DOM מלבד בפונקציית הציור,
// ולכן אפשר להריץ את החישוב גם בבדיקות בצד השרת.

const TWO_PI = Math.PI * 2;

export const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
export const smoothstep = (t) => t * t * (3 - 2 * t);

// הפרש זוויות קצר. בלעדיו מעבר בין 179 ל־181 מעלות מסובב את האיבר הלוך ושוב.
export function shortestAngle(from, to) {
  let delta = (to - from) % TWO_PI;
  if (delta > Math.PI) delta -= TWO_PI;
  if (delta < -Math.PI) delta += TWO_PI;
  return delta;
}

export function lerpAngle(from, to, amount) {
  return from + shortestAngle(from, to) * amount;
}

// קפיץ מרוסן. משמש לתנועה משנית: השהיית זנב, נטיית גוף והתאוששות אחרי פגיעה.
export class Spring {
  constructor({ stiffness = 120, damping = 14, value = 0 } = {}) {
    this.stiffness = stiffness;
    this.damping = damping;
    this.value = value;
    this.velocity = 0;
    this.target = value;
  }

  update(dt) {
    // אינטגרציה בצעדים קטנים, כדי שקפיץ נוקשה לא יתפוצץ בפריים ארוך.
    const steps = Math.max(1, Math.ceil(dt / 0.008));
    const step = dt / steps;
    for (let index = 0; index < steps; index += 1) {
      const acceleration = (this.target - this.value) * this.stiffness - this.velocity * this.damping;
      this.velocity += acceleration * step;
      this.value += this.velocity * step;
    }
    return this.value;
  }

  nudge(amount) {
    this.velocity += amount;
  }
}

function sampleTrack(keys, time) {
  if (keys.length === 0) return null;
  if (time <= keys[0].t) return keys[0];
  if (time >= keys[keys.length - 1].t) return keys[keys.length - 1];

  let index = 0;
  while (index < keys.length - 2 && keys[index + 1].t <= time) index += 1;
  const from = keys[index];
  const to = keys[index + 1];
  const span = to.t - from.t;
  const raw = span === 0 ? 0 : (time - from.t) / span;
  const amount = from.ease === "linear" ? raw : smoothstep(raw);

  return {
    angle: (from.angle ?? 0) + ((to.angle ?? 0) - (from.angle ?? 0)) * amount,
    x: (from.x ?? 0) + ((to.x ?? 0) - (from.x ?? 0)) * amount,
    y: (from.y ?? 0) + ((to.y ?? 0) - (from.y ?? 0)) * amount,
    scale: (from.scale ?? 1) + ((to.scale ?? 1) - (from.scale ?? 1)) * amount,
  };
}

const REST_POSE = { angle: 0, x: 0, y: 0, scale: 1 };

export class Clip {
  constructor(name, definition) {
    this.name = name;
    this.duration = definition.duration;
    this.loop = definition.loop ?? false;
    this.tracks = definition.tracks ?? {};
  }

  // מחזיר את תנוחת כל העצמות בזמן נתון.
  sample(time, out = new Map()) {
    const local = this.loop ? ((time % this.duration) + this.duration) % this.duration : clamp(time, 0, this.duration);
    for (const [bone, keys] of Object.entries(this.tracks)) {
      const value = sampleTrack(keys, local);
      if (value) out.set(bone, { ...REST_POSE, ...value });
    }
    return out;
  }
}

export class Skeleton {
  constructor(rig) {
    this.rig = rig;
    this.bones = rig.bones.map((bone) => ({
      ...bone,
      pose: { angle: 0, x: 0, y: 0, scale: 1 },
      extraAngle: 0,
      world: { x: 0, y: 0, angle: 0, scale: 1 },
    }));
    this.byName = new Map(this.bones.map((bone, index) => [bone.name, index]));
    this.drawOrder = [...this.bones].sort((a, b) => a.drawOrder - b.drawOrder);
    this.evaluation = this.buildEvaluationOrder();
  }

  // הורה חייב להתעדכן לפני ילדיו, גם אם סדר הרשימה בקובץ אינו כזה.
  buildEvaluationOrder() {
    const resolved = [];
    const seen = new Set();
    const visit = (bone) => {
      if (seen.has(bone.name)) return;
      seen.add(bone.name);
      if (bone.parent) {
        const parent = this.bones[this.byName.get(bone.parent)];
        if (parent) visit(parent);
      }
      resolved.push(bone);
    };
    this.bones.forEach(visit);
    return resolved;
  }

  resetPose() {
    for (const bone of this.bones) {
      bone.pose.angle = 0;
      bone.pose.x = 0;
      bone.pose.y = 0;
      bone.pose.scale = 1;
      bone.extraAngle = 0;
    }
  }

  applyPose(poses) {
    for (const [name, value] of poses) {
      const index = this.byName.get(name);
      if (index === undefined) continue;
      const bone = this.bones[index];
      bone.pose.angle = value.angle;
      bone.pose.x = value.x;
      bone.pose.y = value.y;
      bone.pose.scale = value.scale;
    }
  }

  // תוספת מעל הקליף. נועד לתנועה משנית ולתגובות שאינן חלק מהאנימציה.
  addAngle(name, angle) {
    const index = this.byName.get(name);
    if (index !== undefined) this.bones[index].extraAngle += angle;
  }

  update(root) {
    const rootTransform = { x: root.x, y: root.y, angle: root.angle ?? 0, scale: root.scale ?? 1 };
    for (const bone of this.evaluation) {
      const parent = bone.parent ? this.bones[this.byName.get(bone.parent)] : null;
      const base = parent ? parent.world : rootTransform;
      const localX = (bone.local.x + bone.pose.x) * base.scale;
      const localY = (bone.local.y + bone.pose.y) * base.scale;
      const cos = Math.cos(base.angle);
      const sin = Math.sin(base.angle);
      bone.world.x = base.x + localX * cos - localY * sin;
      bone.world.y = base.y + localX * sin + localY * cos;
      bone.world.angle = base.angle + bone.local.angle + bone.pose.angle + bone.extraAngle;
      bone.world.scale = base.scale * bone.pose.scale;
    }
  }
}

// מנגן קליפים עם הצלבה. שינוי מצב אינו מחליף תמונה אלא מתמזג לאורך זמן.
export class Animator {
  constructor(skeleton, clips) {
    this.skeleton = skeleton;
    this.clips = new Map(Object.entries(clips).map(([name, definition]) => [name, new Clip(name, definition)]));
    this.current = null;
    this.currentTime = 0;
    this.previous = null;
    this.previousTime = 0;
    this.fade = 0;
    this.fadeDuration = 0;
    this.currentPoses = new Map();
    this.previousPoses = new Map();
  }

  has(name) {
    return this.clips.has(name);
  }

  get finished() {
    return this.current !== null && !this.current.loop && this.currentTime >= this.current.duration;
  }

  play(name, { fade = 0.14, restart = false } = {}) {
    const clip = this.clips.get(name);
    if (!clip) return false;
    if (this.current === clip && !restart) return false;

    if (this.current && fade > 0) {
      this.previous = this.current;
      this.previousTime = this.currentTime;
      this.fadeDuration = fade;
      this.fade = fade;
    } else {
      this.previous = null;
      this.fade = 0;
    }
    this.current = clip;
    this.currentTime = 0;
    return true;
  }

  update(dt) {
    if (!this.current) return;
    this.currentTime += dt;
    if (this.fade > 0) {
      this.previousTime += dt;
      this.fade = Math.max(0, this.fade - dt);
    }

    this.currentPoses.clear();
    this.current.sample(this.currentTime, this.currentPoses);

    this.skeleton.resetPose();

    if (this.fade > 0 && this.previous) {
      this.previousPoses.clear();
      this.previous.sample(this.previousTime, this.previousPoses);
      const weight = smoothstep(1 - this.fade / this.fadeDuration);
      const blended = new Map();
      const names = new Set([...this.previousPoses.keys(), ...this.currentPoses.keys()]);
      for (const name of names) {
        const from = this.previousPoses.get(name) ?? REST_POSE;
        const to = this.currentPoses.get(name) ?? REST_POSE;
        blended.set(name, {
          angle: lerpAngle(from.angle, to.angle, weight),
          x: from.x + (to.x - from.x) * weight,
          y: from.y + (to.y - from.y) * weight,
          scale: from.scale + (to.scale - from.scale) * weight,
        });
      }
      this.skeleton.applyPose(blended);
      return;
    }

    this.skeleton.applyPose(this.currentPoses);
  }
}

// ציור לקנבס. מקבל תמונת אטלס טעונה ומצייר כל חלק לפי מצב העצם שלו.
export function drawSkeleton(context, skeleton, atlas, { flip = false, alpha = 1 } = {}) {
  context.save();
  if (alpha !== 1) context.globalAlpha *= alpha;
  if (flip) context.scale(-1, 1);
  for (const bone of skeleton.drawOrder) {
    const { rect, offset, rotation } = bone.part;
    const partScale = bone.part.scale ?? 1;
    const { x, y, angle, scale } = bone.world;
    context.save();
    context.translate(x, y);
    context.rotate(angle);
    context.scale(scale * partScale, scale * partScale);
    context.translate(offset.x, offset.y);
    context.rotate(rotation);
    // A rig may ship a reduced atlas: read from the scaled source, draw at full size.
    const k = atlas.atlasScale ?? 1;
    context.drawImage(atlas, rect.x * k, rect.y * k, rect.width * k, rect.height * k, 0, 0, rect.width, rect.height);
    context.restore();
  }
  context.restore();
}
