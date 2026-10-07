import type { MetadataRoute } from "next";
import { timefitManifest } from "@/pwa/manifest-data";

export default function manifest(): MetadataRoute.Manifest { return timefitManifest; }
