"use client";

import React from "react";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/auth-context";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { rideAPI } from "@/lib/api";
import { Car, Bike, Truck, MapPin, Clock } from "lucide-react";
import Navigation from "@/components/navigation";

const rideTypeIcons = {
  bike: Bike,
  car: Car,
  rickshaw: Truck,
};

const statusColors = {
  requested: "bg-yellow-100 text-yellow-800",
  accepted: "bg-blue-100 text-blue-800",
  "in-progress": "bg-green-100 text-green-800",
  completed: "bg-gray-100 text-gray-800",
};

export default function DashboardPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("book");
  const [loading, setLoading] = useState(false);
  const [rides, setRides] = useState([]);
  const [currentRide, setCurrentRide] = useState(null);
  const intervalRef = useRef(null);

  const [availableRiders, setAvailableRiders] = useState([]);
  const [selectedRider, setSelectedRider] = useState(null);
  const [ridersLoading, setRidersLoading] = useState(false);

  const [bookingForm, setBookingForm] = useState({
    pickup: "",
    dropoff: "",
    rideType: "",
  });

  useEffect(() => {
    fetchRides();
    fetchCurrentRide();

    // Set up polling for real-time updates
    startPolling();

    // Cleanup on unmount
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const startPolling = () => {
    // Poll every 5 seconds for updates
    intervalRef.current = setInterval(() => {
      fetchRides();
      fetchCurrentRide();
    }, 5000);
  };

  const stopPolling = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  // Stop polling when component is not visible (optional optimization)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopPolling();
      } else {
        startPolling();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  const fetchRides = async () => {
    try {
      const data = await rideAPI.getRideHistory();
      setRides(data);
    } catch (error) {
      console.error("Error fetching rides:", error);
      // Don't show toast for polling errors to avoid spam
    }
  };

  const fetchCurrentRide = async () => {
    try {
      const data = await rideAPI.getCurrentRide();
      setCurrentRide(data);
    } catch (error) {
      // No current ride is fine
      setCurrentRide(null);
    }
  };

  const fetchAvailableRiders = async (rideType) => {
    if (!rideType) return;

    setRidersLoading(true);
    try {
      const riders = await rideAPI.getAvailableRiders(rideType);
      setAvailableRiders(riders);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch available riders",
        variant: "destructive",
      });
    } finally {
      setRidersLoading(false);
    }
  };

  const handleBookingSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const bookingData = {
        ...bookingForm,
        ...(selectedRider && { riderId: selectedRider.id }),
      };

      const newRide = await rideAPI.bookRide(bookingData);
      setCurrentRide(newRide);
      setBookingForm({ pickup: "", dropoff: "", rideType: "" });
      setSelectedRider(null);
      setAvailableRiders([]);
      toast({
        title: "Ride Booked",
        description: selectedRider
          ? `Your ride has been assigned to ${selectedRider.name}!`
          : "Your ride has been requested successfully!",
      });

      // Immediately fetch updated data
      fetchRides();
      fetchCurrentRide();
    } catch (error) {
      toast({
        title: "Booking Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setBookingForm((prev) => ({
      ...prev,
      [field]: value,
    }));

    // Fetch available riders when ride type changes
    if (field === "rideType") {
      fetchAvailableRiders(value);
      setSelectedRider(null);
    }
  };

  // Manual refresh function
  const handleRefresh = () => {
    fetchRides();
    fetchCurrentRide();
    toast({
      title: "Refreshed",
      description: "Ride data has been updated",
    });
  };

  console.log(rides);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />

      <div className="container mx-auto px-4 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Welcome, {user?.name}!
            </h1>
            <p className="text-gray-600">
              Book your ride or track your current journey
            </p>
          </div>
          <Button onClick={handleRefresh} variant="outline" size="sm">
            Refresh
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Current Ride Status */}
          {currentRide && (
            <div className="lg:col-span-3">
              <Card className="mb-8">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Current Ride
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-green-600" />
                        <span className="text-sm">
                          From: {currentRide.pickup}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-red-600" />
                        <span className="text-sm">
                          To: {currentRide.dropoff}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {React.createElement(
                          rideTypeIcons[currentRide.rideType],
                          { className: "h-4 w-4" }
                        )}
                        <span className="text-sm capitalize">
                          {currentRide.rideType}
                        </span>
                      </div>
                    </div>
                    <Badge className={statusColors[currentRide.status]}>
                      {currentRide.status.replace("-", " ").toUpperCase()}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Book a Ride */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Book a Ride</CardTitle>
                <CardDescription>
                  Choose your pickup and drop-off locations
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleBookingSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="pickup">Pickup Location</Label>
                    <Input
                      id="pickup"
                      value={bookingForm.pickup}
                      onChange={(e) =>
                        handleInputChange("pickup", e.target.value)
                      }
                      placeholder="Enter pickup location"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="dropoff">Drop-off Location</Label>
                    <Input
                      id="dropoff"
                      value={bookingForm.dropoff}
                      onChange={(e) =>
                        handleInputChange("dropoff", e.target.value)
                      }
                      placeholder="Enter drop-off location"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Ride Type</Label>
                    <Select
                      value={bookingForm.rideType}
                      onValueChange={(value) =>
                        handleInputChange("rideType", value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select ride type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="bike">
                          <div className="flex items-center gap-2">
                            <Bike className="h-4 w-4" />
                            Bike
                          </div>
                        </SelectItem>
                        <SelectItem value="car">
                          <div className="flex items-center gap-2">
                            <Car className="h-4 w-4" />
                            Car
                          </div>
                        </SelectItem>
                        <SelectItem value="rickshaw">
                          <div className="flex items-center gap-2">
                            <Truck className="h-4 w-4" />
                            Rickshaw
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {bookingForm.rideType && (
                    <div className="space-y-2">
                      <Label>Available Riders</Label>
                      {ridersLoading ? (
                        <div className="flex justify-center py-4">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                        </div>
                      ) : availableRiders.length === 0 ? (
                        <p className="text-sm text-gray-500 py-2">
                          No riders available for {bookingForm.rideType}
                        </p>
                      ) : (
                        <div className="space-y-2 max-h-40 overflow-y-auto">
                          {availableRiders.map((rider) => (
                            <div
                              key={rider.id}
                              className={`p-3 border rounded-lg transition-colors ${
                                selectedRider?.id === rider.id
                                  ? "border-primary bg-primary/5"
                                  : "border-gray-200 hover:border-gray-300"
                              }`}
                              // onClick={() => setSelectedRider(rider)}
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="font-medium">{rider.name}</p>
                                  <p className="text-sm text-gray-600">
                                    {rider.vehicleType}
                                    {/* • ⭐ {rider.rating || "New"} • {rider.totalRides} rides */}
                                  </p>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                                    Available
                                  </span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={
                      loading || !!currentRide || availableRiders.length === 0
                    }
                  >
                    {loading
                      ? "Booking..."
                      : currentRide
                      ? "Ride in Progress"
                      : "Book Ride"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Ride History */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle>Recent Rides</CardTitle>
                <CardDescription>Your ride history</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {rides.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">
                      No rides yet
                    </p>
                  ) : (
                    rides.slice(0, 5).map((ride) => (
                      <div key={ride.id} className="border rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            {React.createElement(rideTypeIcons[ride.rideType], {
                              className: "h-4 w-4",
                            })}
                            <span className="font-medium capitalize">
                              {ride.rideType}
                            </span>
                          </div>
                          <Badge className={statusColors[ride.status]}>
                            {ride.status.replace("-", " ")}
                          </Badge>
                        </div>
                        <div className="text-sm text-gray-600">
                          <div>
                            {ride.pickup} → {ride.dropoff}
                          </div>
                          <div>
                            {new Date(ride.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
