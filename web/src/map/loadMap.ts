import { useEffect, useState } from "react";
import useGoogleMapsLibrary from "../hooks/useGoogleMapsLibrary";

export default function useLoadMap() {
    const [googleMap, setGoogleMap] = useState<any>(null);

    useEffect(() => {
        (g => { var h: Promise<unknown>, a, k, p = "The Google Maps JavaScript API", c = "google", l = "importLibrary", q = "__ib__", m = document, b = window; b = b[c] || (b[c] = {}); var d = b.maps || (b.maps = {}), r = new Set, e = new URLSearchParams, u = () => h || (h = new Promise(async (f, n) => { await (a = m.createElement("script")); e.set("libraries", [...r] + ""); for (k in g) e.set(k.replace(/[A-Z]/g, t => "_" + t[0].toLowerCase()), g[k]); e.set("callback", c + ".maps." + q); a.src = `https://maps.${c}apis.com/maps/api/js?` + e; d[q] = f; a.onerror = () => h = n(Error(p + " could not load.")); a.nonce = m.querySelector("script[nonce]")?.nonce || ""; m.head.append(a) })); d[l] ? console.warn(p + " only loads once. Ignoring:", g) : d[l] = (f, ...n) => r.add(f) && u().then(() => d[l](f, ...n)) })({
            key: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
            v: "weekly",
            // Use the 'v' parameter to indicate the version to use (weekly, beta, alpha, etc.).
            // Add other bootstrap parameters as needed, using camel case.
        });
    }, []);
    

    useGoogleMapsLibrary("maps", lib => {
        const map = new lib.Map(document.getElementById("map") as HTMLElement, {
            center: { lat: 43.4718, lng: -80.543 },
            zoom: 16,
            mapId: 'map',
            gestureHandling: "greedy",
            mapTypeControl: false,
            streetViewControl: false
        });

        console.log('loaded map');
		setGoogleMap(map);
    });
    
    return { googleMap, setGoogleMap };
}
