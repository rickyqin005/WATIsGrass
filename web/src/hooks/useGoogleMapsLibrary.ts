import { useEffect, useState } from "react";
import { GoogleMapsLibrary } from "../map/GoogleMapsLibrary";

/**
 * Fetch a library from the Google Maps API
 * @param name The name of the library to be imported
 * @param callback A function to be run after the library is imported, taking the imported library as its only argument
 * @returns library, libraryIsLoaded states
 */
export default function useGoogleMapsLibrary(name: string, callback = (lib: GoogleMapsLibrary) => {}) {
    const [library, setLibrary] = useState<GoogleMapsLibrary | null>(null);
    const [libraryIsLoaded, setLibraryIsLoaded] = useState(false);
    
    useEffect(() => {
        setLibraryIsLoaded(false);
        google.maps.importLibrary(name).then(res => {
            setLibrary(res);
            setLibraryIsLoaded(true);
            callback(res);
        }).catch(error => console.log(error));
    }, []);

    return { library, libraryIsLoaded };
}
