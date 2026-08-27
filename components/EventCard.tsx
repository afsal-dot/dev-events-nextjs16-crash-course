import Image from "next/image";
import Link from "next/link";

interface Props {
    title: string;
    image: string
}

const EventCard = ({title, image}: Props) => {
    return (
        <div>
            <Link href="/">
                <p>{title}</p>
                <Image src={image} alt={"images of the event"} width={410} height={300} className="poster"/>
            </Link>
        </div>
    )
}
export default EventCard
