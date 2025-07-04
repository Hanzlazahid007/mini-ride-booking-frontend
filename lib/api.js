import Cookies from "js-cookie"

// API configuration
const API_BASE_URL = "http://localhost:5000/api"

// Helper function to get auth token
const getAuthToken = () => {
  return Cookies.get("token")
}

// Helper function to make API requests
const apiRequest = async (endpoint, options = {}) => {
  const url = `${API_BASE_URL}${endpoint}`
  const token = getAuthToken()

  const config = {
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
    ...options,
  }

  if (config.body && typeof config.body === "object") {
    config.body = JSON.stringify(config.body)
  }

  const response = await fetch(url, config)
  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.error || "Something went wrong")
  }

  return data
}

export const authAPI = {
  async login(email, password) {
    const response = await apiRequest("/auth/login", {
      method: "POST",
      body: { email, password },
    })
    return response
  },

  async signup(userData) {
    const response = await apiRequest("/auth/signup", {
      method: "POST",
      body: userData,
    })
    return response
  },

  async verifyToken() {
    const response = await apiRequest("/auth/verify")
    return response.user
  },
}

export const rideAPI = {
  async bookRide(rideData) {
    const response = await apiRequest("/rides/book", {
      method: "POST",
      body: rideData,
    })
    return response.ride
  },

  async getRideHistory() {
    const response = await apiRequest("/rides/history")
    return response.rides
  },

  async getCurrentRide() {
    const response = await apiRequest("/rides/current")
    return response.ride
  },

  async getAvailableRides() {
    const response = await apiRequest("/rides/available")
    return response.rides
  },

  async getMyRiderRides() {
    const response = await apiRequest("/rides/my-rides")
    return response.rides
  },

  async updateRideStatus(rideId, status) {
    const response = await apiRequest(`/rides/${rideId}/status`, {
      method: "PATCH",
      body: { status },
    })
    return response.ride
  },

  async getAvailableRiders(rideType) {
    const endpoint = rideType ? `/riders/available?rideType=${rideType}` : "/riders/available"
    const response = await apiRequest(endpoint)
    return response.riders
  },

  async updateRiderAvailability(status) {
    const response = await apiRequest("/riders/availability", {
      method: "PATCH",
      body: { status },
    })
    return response
  },
}
