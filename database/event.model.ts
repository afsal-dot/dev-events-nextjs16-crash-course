import mongoose, { Schema, type Model } from "mongoose";

export interface EventDocument {
  title: string;
  slug: string;
  description: string;
  overview: string;
  image: string;
  venue: string;
  location: string;
  date: string;
  time: string;
  mode: "online" | "offline" | "hybrid";
  audience: string;
  agenda: string[];
  organizer: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

const hasText = (value: string): boolean => value.trim().length > 0;

const hasNonEmptyStrings = (values: string[]): boolean =>
  values.length > 0 && values.every(hasText);

const createSlug = (title: string): string =>
  title
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const normalizeDate = (value: string): string => {
  const normalized = value.trim();
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(normalized);

  if (!match) {
    throw new Error("Event date must use YYYY-MM-DD format.");
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw new Error("Event date must be a valid calendar date.");
  }

  return normalized;
};

const normalizeTime = (value: string): string => {
  const match = value
    .trim()
    .toUpperCase()
    .match(/^(\d{1,2}):(\d{2})(?:\s*([AP]M))?$/);

  if (!match) {
    throw new Error(
      "Event time must use HH:mm or h:mm AM/PM format.",
    );
  }

  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  const meridiem = match[3];

  if (minutes < 0 || minutes > 59) {
    throw new Error("Event time contains invalid minutes.");
  }

  if (meridiem) {
    if (hours < 1 || hours > 12) {
      throw new Error("12-hour event time must use hours from 1 to 12.");
    }

    if (meridiem === "AM") {
      hours = hours === 12 ? 0 : hours;
    } else {
      hours = hours === 12 ? 12 : hours + 12;
    }
  } else if (hours < 0 || hours > 23) {
    throw new Error("24-hour event time must use hours from 0 to 23.");
  }

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
};

const requiredString = {
  type: String,
  required: true,
  trim: true,
  validate: {
    validator: hasText,
    message: "This field cannot be empty.",
  },
};

const EventSchema = new Schema<EventDocument>(
  {
    title: requiredString,
    slug: {
      type: String,
      trim: true,
    },
    description: requiredString,
    overview: requiredString,
    image: requiredString,
    venue: requiredString,
    location: requiredString,
    date: requiredString,
    time: requiredString,
    mode: {
      type: String,
      required: true,
      enum: ["online", "offline", "hybrid"],
      lowercase: true,
      trim: true,
    },
    audience: requiredString,
    agenda: {
      type: [String],
      required: true,
      set: (values: string[]) => values.map((value) => value.trim()),
      validate: {
        validator: hasNonEmptyStrings,
        message: "Agenda must contain at least one non-empty item.",
      },
    },
    organizer: requiredString,
    tags: {
      type: [String],
      required: true,
      set: (values: string[]) => values.map((value) => value.trim()),
      validate: {
        validator: hasNonEmptyStrings,
        message: "Tags must contain at least one non-empty item.",
      },
    },
  },
  {
    timestamps: true,
  },
);

// A unique index prevents two events from resolving to the same URL.
EventSchema.index({ slug: 1 }, { unique: true });

EventSchema.pre("save", function () {
  // Changing the title changes the URL slug; other updates leave it untouched.
  if (this.isModified("title")) {
    this.slug = createSlug(this.title);

    if (!this.slug) {
      throw new Error("Event title must produce a valid URL slug.");
    }
  }

  // Store dates and times in predictable formats for querying and display.
  if (this.isModified("date")) {
    this.date = normalizeDate(this.date);
  }

  if (this.isModified("time")) {
    this.time = normalizeTime(this.time);
  }
});

const rejectEventWriteWithoutSave = (): never => {
  throw new Error(
    "Event writes must use save() or create() so schema invariants run.",
  );
};

// These APIs bypass document save hooks, so reject them instead of saving unsafe data.
EventSchema.pre("insertMany", rejectEventWriteWithoutSave);
EventSchema.pre("bulkWrite", rejectEventWriteWithoutSave);
EventSchema.pre(
  [
    "updateOne",
    "updateMany",
    "findOneAndUpdate",
    "replaceOne",
    "findOneAndReplace",
  ],
  rejectEventWriteWithoutSave,
);

const Event: Model<EventDocument> =
  (mongoose.models.Event as Model<EventDocument> | undefined) ??
  mongoose.model<EventDocument>("Event", EventSchema);

export default Event;
