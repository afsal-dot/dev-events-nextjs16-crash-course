"use client";

import Image from "next/image";
import Link from "next/link";
import posthog from "posthog-js";

interface Props {
    title: string;
    image: string
}

const EventCard = ({title, image}: Props) => {
    return (
        <div>
            <Link
                href="/"
                onClick={() => posthog.capture("featured_event_selected")}
            >
                <p>{title}</p>
                <Image src={image} alt={"images of the event"} width={410} height={300} className="poster"/>
            </Link>
        </div>
    )
}
export default EventCard
