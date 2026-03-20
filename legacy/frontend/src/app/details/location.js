import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

function LocationMarker({ latitude, longitude, locationName }) {
  return (
    <Marker
      icon={L.icon({
        iconUrl: 'https://cdn0.iconfinder.com/data/icons/small-n-flat/24/678111-map-marker-512.png',
        iconSize: [41, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        tooltipAnchor: [16, -28],
        shadowSize: [41, 41]
        })}



      position={[latitude, longitude]}>
      <Popup>
        <div>
          <h3>{locationName}</h3>
          <p>Latitude: {latitude}</p>
          <p>Longitude: {longitude}</p>
        </div>
      </Popup>
    </Marker>
  );
}

function MapWithLocationMarker({ locationName, latitude, longitude }) {
  return (
    <MapContainer
      center={[latitude, longitude]}
      zoom={13}
      style={{ height: '100%', width: '100%', zIndex: 0 }}
    >
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <LocationMarker latitude={latitude} longitude={longitude} locationName={locationName} />
    </MapContainer>
  );
}

// const Location = ({ latitude, longitude, location }) => {
//   // Check if latitude and longitude are valid numbers
//   const isValidCoordinates = latitude !== undefined && longitude !== undefined;

const Location = ({ location }) => {
  const mapSrc = `https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3963.121367677097!2d${
    location.longitude
  }!3d${
    location.latitude
  }!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x103b8e2f7e4e1e2d%3A0x8b3e1b4d1d3d6e4d!2s${encodeURIComponent(
    location
  )}!5e0!3m2!1sen!2sng!4v1632922050736!5m2!1sen!2sng`;
  const isValidCoordinates = location.latitude !== undefined && location.longitude !== undefined;
  return (
    <div className="flex flex-col gap-5 rounded-lg shadow border p-4">
      <h4 className="text-lg font-bold text-black 2xl:text-2xl">Location</h4>
      <div className="w-full min-h-[22rem] ">

        {isValidCoordinates ? (
          <MapWithLocationMarker locationName={location.location} latitude={location.latitude} longitude={location.longitude} />
        ) : (
          <p>Loading map...</p> // or display an error message if needed
        )}

        {/* <iframe
          src={mapSrc}
          width="100%"
          height="100%"
          style={{ border: 0 }}
          className="rounded-lg"
          allowFullScreen=""
          loading="lazy"
        ></iframe> */}
      </div>
    </div>
  );
};

export default Location;
