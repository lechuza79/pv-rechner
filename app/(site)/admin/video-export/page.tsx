import VideoExportTest from "./test";

export const metadata = {
  title: "Videoexport – Solar Check Admin",
  robots: { index: false, follow: false },
};

// Smallest functional test view of the server video export for entitled
// sessions (guard in the admin layout, again in the API). Not a design: the
// real entry point is the options menu of the widget.
export const dynamic = "force-dynamic";

export default function Page() {
  return <VideoExportTest />;
}
