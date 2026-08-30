import mongoose, { Schema, Types, type Model } from "mongoose";

import Event from "./event.model";

export interface BookingDocument {
  eventId: Types.ObjectId;
  email: string;
  createdAt: Date;
  updatedAt: Date;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const BookingSchema = new Schema<BookingDocument>(
  {
    eventId: {
      type: Schema.Types.ObjectId,
      ref: "Event",
      required: true,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      match: [EMAIL_PATTERN, "A valid email address is required."],
    },
  },
  {
    timestamps: true,
  },
);

// Most booking queries filter by event, so this index avoids collection scans.
BookingSchema.index({ eventId: 1 });

BookingSchema.pre("save", async function () {
  if (!this.isModified("eventId")) {
    return;
  }

  // A Mongoose ref alone does not guarantee the referenced event exists.
  const eventExists = await Event.exists({ _id: this.eventId });

  if (!eventExists) {
    throw new Error("Cannot create a booking for an event that does not exist.");
  }
});

const Booking: Model<BookingDocument> =
  (mongoose.models.Booking as Model<BookingDocument> | undefined) ??
  mongoose.model<BookingDocument>("Booking", BookingSchema);

export default Booking;
