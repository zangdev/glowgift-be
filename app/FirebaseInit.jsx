"use client"

import { useEffect } from 'react'
import { getAnalyticsIfSupported } from '../lib/firebaseClient'

export default function FirebaseInit() {
  useEffect(() => {
    getAnalyticsIfSupported()
  }, [])
  return null
}
