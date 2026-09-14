'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'

interface InfoPriceContextType {
  showInfoPrice: boolean
  toggleInfoPrice: () => void
  setShowInfoPrice: (value: boolean) => void
}

const InfoPriceContext = createContext<InfoPriceContextType>({
  showInfoPrice: true,
  toggleInfoPrice: () => {},
  setShowInfoPrice: () => {},
})

export function InfoPriceProvider({ children }: { children: React.ReactNode }) {
  const [showInfoPrice, setShowInfoPriceState] = useState<boolean>(true)

  useEffect(() => {
    const saved = localStorage.getItem('show_info_price')
    if (saved !== null) {
      setShowInfoPriceState(saved === 'true')
    }
  }, [])

  const setShowInfoPrice = (val: boolean) => {
    setShowInfoPriceState(val)
    localStorage.setItem('show_info_price', String(val))
  }

  const toggleInfoPrice = () => {
    setShowInfoPriceState(prev => {
      const next = !prev
      localStorage.setItem('show_info_price', String(next))
      return next
    })
  }

  return (
    <InfoPriceContext.Provider value={{ showInfoPrice, toggleInfoPrice, setShowInfoPrice }}>
      {children}
    </InfoPriceContext.Provider>
  )
}

export function useInfoPrice() {
  return useContext(InfoPriceContext)
}
