'use client'

import { APIProvider, Map, AdvancedMarker, Pin } from '@vis.gl/react-google-maps'
import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'

export default function Home() {
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [vendors, setVendors] = useState<any[]>([])
  const [selectedVendor, setSelectedVendor] = useState<any | null>(null)

  // Get user location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          })
        },
        (error) => {
          console.error('Error getting location:', error)
          setUserLocation({ lat: 17.385, lng: 78.4867 })
        }
      )
    }
  }, [])

  // Fetch vendors from Supabase
  useEffect(() => {
    async function fetchVendors() {
      const { data, error } = await supabase
        .from('vendors')
        .select('*')

      if (error) {
        console.error('Error fetching vendors:', error)
      } else if (data) {
        console.log('Vendors:', data)
        setVendors(data)
      }
    }
    fetchVendors()
  }, [])

  if (!userLocation) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p>Loading map...</p>
      </div>
    )
  }

  return (
    <div style={{ height: '100vh', width: '100%', position: 'relative' }}>
      <APIProvider apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!}>
        <Map
          defaultCenter={userLocation}
          defaultZoom={15}
          mapId="foodmad-map"
          style={{ width: '100%', height: '100%' }}
          onClick={() => setSelectedVendor(null)}
        >
          {vendors.filter(v => v.lat && v.lng).map((vendor) => (
            <AdvancedMarker
              key={vendor.id}
              position={{ lat: vendor.lat, lng: vendor.lng }}
              onClick={() => setSelectedVendor(vendor)}
            >
              <Pin
                background={vendor.source === 'manual' ? '#F59E0B' : '#9CA3AF'}
                borderColor={vendor.source === 'manual' ? '#D97706' : '#6B7280'}
                glyphColor={'#FFFFFF'}
              />
            </AdvancedMarker>
          ))}
        </Map>
      </APIProvider>

      {selectedVendor && (
        <div style={{
          position: 'absolute',
          bottom: 80,
          left: 16,
          right: 16,
          background: '#1a1a1a',
          color: 'white',
          borderRadius: 12,
          padding: 16,
          boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: 18 }}>{selectedVendor.name}</h3>
            <span style={{
              background: selectedVendor.source === 'manual' ? '#F59E0B' : '#6B7280',
              color: 'black',
              padding: '2px 8px',
              borderRadius: 12,
              fontSize: 12,
              fontWeight: 600,
            }}>
              {selectedVendor.source === 'manual' ? 'Vendor' : 'Restaurant'}
            </span>
          </div>
          <p style={{ margin: '8px 0 4px', color: '#9CA3AF', fontSize: 14 }}>
            {selectedVendor.type?.replace('_', ' ')} • {selectedVendor.hours}
          </p>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
            {selectedVendor.cuisine_tags?.map((tag: string) => (
              <span key={tag} style={{
                background: '#333',
                padding: '4px 10px',
                borderRadius: 16,
                fontSize: 12,
                color: '#E5E7EB',
              }}>
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}