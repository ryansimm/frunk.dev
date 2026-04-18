import React, { useEffect, useMemo, useState } from 'react'
import './TheGarage.css'
import logo from '../../assets/logo.png'
import carbonwheel from '../../assets/CarbonWheels.png'
import classicwheel from '../../assets/ClassicWheels.png'
import flame from '../../assets/FlameDecal.png'
import lightning from '../../assets/LightningDecal.png'
import stripe from '../../assets/RacingStripes.png'
import rallywheel from '../../assets/RallyWheels.png'
import stockwheel from '../../assets/StockWheels.png'

import { apiService } from '../../services/api'

const STAT_KEYS = ['Acceleration', 'Handling', 'Braking', 'Top Speed']
const BASE_STATS = {
  Acceleration: 50,
  Handling: 50,
  Braking: 50,
  'Top Speed': 50
}

const GARAGE_STORE = {
  Wheels: [
    {
      id: 'wheels-stock',
      name: 'Stock Wheels',
      cost: 0,
      image: stockwheel,
      effects: {},
      isStock: true
    },
    {
      id: 'wheels-classic',
      name: 'Classic Wheels',
      cost: 10,
      image: classicwheel,
      effects: { Acceleration: 10, Handling: 5 }
    },
    {
      id: 'wheels-rally',
      name: 'Rally Wheels',
      cost: 30,
      image: rallywheel,
      effects: { Handling: 15, Braking: 10, 'Top Speed': -2 }
    },
    {
      id: 'wheels-carbon',
      name: 'Carbon Wheels',
      cost: 50,
      image: carbonwheel,
      effects: { Acceleration: 25, 'Top Speed': 17, Braking: -3 }
    }
  ],
  Wings: [
    {
      id: 'no-wing',
      name: 'No Wing',
      cost: 0,
      image: logo,
      effects: {},
      isStock: true
    },
    {
      id: 'wing-basic',
      name: 'Basic Wing',
      cost: 25,
      image: logo,
      effects: { Handling: 10, Braking: 3 }
    },
    {
      id: 'wing-track',
      name: 'Track Wing',
      cost: 40,
      image: logo,
      effects: { Handling: 20, Braking: 10, 'Top Speed': -2 }
    },
    {
      id: 'wing-aero',
      name: 'Aero Wing',
      cost: 55,
      image: logo,
      effects: { 'Top Speed': 18, Handling: 30, Braking: -2 }
    }
  ],
  Decal: [
    {
      id: 'decal-stock',
      name: 'Stock Decal',
      cost: 0,
      image: logo,
      effects: {},
      isStock: true
    },
    {
      id: 'decal-stripes',
      name: 'Speed Stripes',
      cost: 15,
      image: stripe,
      effects: { Acceleration: 2, Braking : 10 }
    },
    {
      id: 'decal-flames',
      name: 'Flame Pack',
      cost: 30,
      image: flame,
      effects: { 'Top Speed': 5, Acceleration: 5 }
    },
    {
      id: 'decal-lightning',
      name: 'Lightning Pack',
      cost: 45,
      image: lightning,
      effects: { Acceleration: 2, Handling: 1, Braking : 8}
    }
  ],
  Colour: [
    {
      id: 'colour-stock',
      name: 'Stock Colour',
      cost: 0,
      image: logo,
      effects: {},
      isStock: true
    },
    {
      id: 'colour-racing-red',
      name: 'Racing Red',
      cost: 20,
      image: logo,
      effects: { Acceleration: 4, 'Top Speed': 6 }
    },
    {
      id: 'colour-midnight-blue',
      name: 'Midnight Blue',
      cost: 20,
      image: logo,
      effects: { Handling: 3, Braking: 5 }
    },
    {
      id: 'colour-graphite-black',
      name: 'Graphite Black',
      cost: 20,
      image: logo,
      effects: { Braking: 15 }
    }
  ]
}

const STOCK_SETUP = {
  Wheels: 'wheels-stock',
  Wings: 'no-wing',
  Decal: 'decal-stock',
  Colour: 'colour-stock'
}

const STOCK_ITEM_IDS = Object.values(STOCK_SETUP)
const LEGACY_ITEM_IDS = {
  'wing-stock': 'no-wing'
}

const PURCHASES_KEY = 'garagePurchases'
const EQUIPPED_KEY = 'garageEquipped'
const STATS_KEY = 'garagePerformanceStats'

const readTokenBalance = () => {
  try {
    const user = JSON.parse(localStorage.getItem('user') || '{}')
    const parsed = Number(user?.tokenBalance || 0)
    return Number.isFinite(parsed) ? parsed : 0
  } catch {
    return 0
  }
}

const readOwnedItems = () => {
  try {
    const raw = localStorage.getItem(PURCHASES_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    const purchasedItems = Array.isArray(parsed)
      ? parsed.map((itemId) => LEGACY_ITEM_IDS[itemId] || itemId)
      : []
    return [...new Set([...STOCK_ITEM_IDS, ...purchasedItems])]
  } catch {
    return [...STOCK_ITEM_IDS]
  }
}

const readEquippedItems = () => {
  try {
    const raw = localStorage.getItem(EQUIPPED_KEY)
    const parsed = raw ? JSON.parse(raw) : {}
    if (!parsed || typeof parsed !== 'object') return {}

    return Object.entries(parsed).reduce((accumulator, [sectionName, itemId]) => {
      accumulator[sectionName] = LEGACY_ITEM_IDS[itemId] || itemId
      return accumulator
    }, {})
  } catch {
    return {}
  }
}

const readCurrentVehicle = () => {
  try {
    const gameSelection = JSON.parse(localStorage.getItem('gameSelection') || '{}')
    const savedCarName = gameSelection?.car?.name
    const carName = savedCarName === 'Swift Starter' ? 'Jett Stream' : savedCarName
    return carName || 'Current Vehicle'
  } catch {
    return 'Current Vehicle'
  }
}

const TheGarage = () => {
  const [tokenBalance, setTokenBalance] = useState(readTokenBalance)
  const [ownedItems, setOwnedItems] = useState(readOwnedItems)
  const [equippedItems, setEquippedItems] = useState(readEquippedItems)
  const [statusMessage, setStatusMessage] = useState('')
  const [currentVehicleName] = useState(readCurrentVehicle)
  const [pendingPurchaseId, setPendingPurchaseId] = useState('')

  const ownedSet = useMemo(() => new Set(ownedItems), [ownedItems])
  const itemLookup = useMemo(() => {
    const lookup = {}
    Object.entries(GARAGE_STORE).forEach(([sectionName, items]) => {
      items.forEach((item) => {
        lookup[item.id] = { ...item, sectionName }
      })
    })
    return lookup
  }, [])

  const currentStats = useMemo(() => {
    const totals = { ...BASE_STATS }

    Object.values(equippedItems).forEach((itemId) => {
      const item = itemLookup[itemId]
      if (!item || !item.effects) return

      STAT_KEYS.forEach((key) => {
        const delta = Number(item.effects[key] || 0)
        totals[key] = Math.max(0, Math.min(100, totals[key] + delta))
      })
    })

    return totals
  }, [equippedItems, itemLookup])

  useEffect(() => {
    localStorage.setItem(STATS_KEY, JSON.stringify(currentStats))
  }, [currentStats])

  const formatEffect = (value) => (value >= 0 ? `+${value}` : `${value}`)

  const getNetEffectDelta = (sectionName, item, key) => {
    const equippedItemId = equippedItems[sectionName]
    const equippedItem = itemLookup[equippedItemId]
    const incoming = Number(item.effects?.[key] || 0)
    const currentlyApplied = Number(equippedItem?.effects?.[key] || 0)
    return incoming - currentlyApplied
  }

  const handleEquip = (sectionName, item) => {
    if (!ownedSet.has(item.id)) {
      setStatusMessage(`Purchase ${item.name} before equipping it.`)
      return
    }

    const nextEquipped = {
      ...equippedItems,
      [sectionName]: item.id
    }

    setEquippedItems(nextEquipped)
    localStorage.setItem(EQUIPPED_KEY, JSON.stringify(nextEquipped))
    setStatusMessage(`Equipped ${item.name}.`)
  }

  const handlePurchase = async (sectionName, item) => {
    if (ownedSet.has(item.id)) {
      setStatusMessage(`${item.name} is already owned.`)
      return
    }

    if (tokenBalance < item.cost) {
      setStatusMessage(`Not enough tokens for ${item.name}.`)
      return
    }

    setPendingPurchaseId(item.id)

    try {
      const spendResult = await apiService.spendTokens({
        amount: item.cost,
        reason: 'garage_purchase',
        itemId: item.id,
        itemName: item.name
      })

      const serverBalance = Number(spendResult?.tokenBalance)
      const updatedBalance = Number.isFinite(serverBalance)
        ? serverBalance
        : tokenBalance - item.cost

      const nextOwnedItems = [...ownedItems, item.id]

      setTokenBalance(updatedBalance)
      setOwnedItems(nextOwnedItems)
      setStatusMessage(`Purchased ${item.name} for ${item.cost} tokens.`)

      localStorage.setItem(PURCHASES_KEY, JSON.stringify(nextOwnedItems))

      const nextEquipped = {
        ...equippedItems,
        [sectionName]: item.id
      }
      setEquippedItems(nextEquipped)
      localStorage.setItem(EQUIPPED_KEY, JSON.stringify(nextEquipped))

      const storedUser = JSON.parse(localStorage.getItem('user') || '{}')
      localStorage.setItem('user', JSON.stringify({
        ...storedUser,
        tokenBalance: updatedBalance,
        totalTokensEarned: Number(spendResult?.totalTokensEarned ?? storedUser.totalTokensEarned ?? 0),
        totalTokensSpent: Number(spendResult?.totalTokensSpent ?? storedUser.totalTokensSpent ?? 0)
      }))

      window.dispatchEvent(new CustomEvent('tokenBalanceUpdated', {
        detail: { tokenBalance: updatedBalance }
      }))
    } catch (purchaseError) {
      setStatusMessage(purchaseError?.response?.data?.error || purchaseError?.message || `Unable to purchase ${item.name}.`)
    } finally {
      setPendingPurchaseId('')
    }
  }

  return (
    <div className="garage-page">
      <div className="garage-card">
        <h1>The Garage</h1>
        <p className="garage-subtitle">Spend your tokens to upgrade your car setup.</p>

        {statusMessage && (
          <p className="garage-status" role="status">{statusMessage}</p>
        )}

        <div className="garage-layout">
          <div className="garage-store-column">
            {Object.entries(GARAGE_STORE).map(([sectionName, items]) => (
              <section key={sectionName} className="garage-section">
                <h2>{sectionName}</h2>
                <div className="garage-items-grid">
                  {items.map((item) => {
                    const isOwned = ownedSet.has(item.id)
                    const canAfford = tokenBalance >= item.cost
                    const isEquipped = equippedItems[sectionName] === item.id

                    return (
                      <article key={item.id} className="garage-item-card">
                        <div className="garage-item-image-slot">
                          {item.image ? (
                            <img src={item.image} alt={item.name} className="garage-item-image" />
                          ) : (
                            <span>PNG Slot</span>
                          )}
                        </div>
                        <h3>{item.name}</h3>
                        <p>{isOwned ? 'Owned' : `Cost: ${item.cost} tokens`}</p>
                        <ul className="garage-item-effects">
                          {STAT_KEYS.map((key) => {
                            const delta = getNetEffectDelta(sectionName, item, key)
                            if (delta === 0) return null

                            return (
                              <li key={`${item.id}-${key}`}>
                                <span>{key}</span>
                                <strong>{formatEffect(delta)}</strong>
                              </li>
                            )
                          })}
                        </ul>
                        <button
                          type="button"
                          className="garage-action"
                          onClick={() => handlePurchase(sectionName, item)}
                          disabled={isOwned || !canAfford || pendingPurchaseId === item.id}
                        >
                          {isOwned
                            ? 'Owned'
                            : pendingPurchaseId === item.id
                              ? 'Purchasing...'
                              : canAfford
                                ? 'Purchase'
                                : 'Not Enough Tokens'}
                        </button>
                        <button
                          type="button"
                          className="garage-action garage-equip-action"
                          onClick={() => handleEquip(sectionName, item)}
                          disabled={!isOwned || isEquipped}
                        >
                          {isEquipped ? 'Equipped' : 'Equip'}
                        </button>
                      </article>
                    )
                  })}
                </div>
              </section>
            ))}

            <section className="garage-section garage-coming-soon">
              <h2>Body</h2>
              <p>Coming Soon - Work in Progress...</p>
            </section>
          </div>

          <div className="garage-sidebar-column">
            <aside className="garage-vehicle-column">
              <h2>Current Vehicle</h2>
              <div className="garage-vehicle-preview">
                <img src={logo} alt={currentVehicleName} className="garage-vehicle-image" />
              </div>
              <p className="garage-vehicle-name">{currentVehicleName}</p>

              <section className="garage-stats-panel" aria-label="Performance stats chart">
                <h3>Performance Stats</h3>
                <div className="garage-stats-chart">
                  {STAT_KEYS.map((key) => {
                    const value = currentStats[key]
                    return (
                      <div key={key} className="garage-stat-row">
                        <span className="garage-stat-label">{key}</span>
                        <div className="garage-stat-track">
                          <div
                            className={`garage-stat-fill ${value >= 100 ? 'is-max' : ''}`}
                            style={{ width: `${value}%` }}
                            role="img"
                            aria-label={`${key} ${value} out of 100`}
                          />
                        </div>
                        <span className="garage-stat-value">{value}</span>
                      </div>
                    )
                  })}
                </div>
              </section>
            </aside>

            <div className="garage-balance">
              <strong>Available Tokens:</strong> {tokenBalance}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default TheGarage
