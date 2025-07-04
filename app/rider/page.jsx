"use client";

import React from "react";

import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/contexts/auth-context";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { rideAPI } from "@/lib/api";
import {
  Car,
  Bike,
  Truck,
  MapPin,
  User,
  Phone,
  Clock,
  RefreshCw,
} from "lucide-react";
import Navigation from "@/components/navigation";
import { useRouter } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Cookies from "js-cookie";

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

export default function RiderPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [availableRides, setAvailableRides] = useState([]);
  const [myRides, setMyRides] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState({});
  const [activeTab, setActiveTab] = useState("available");
  const [availabilityStatus, setAvailabilityStatus] = useState("available");
  const [statusLoading, setStatusLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  // Refs for cleanup
  const intervalRef = useRef(null);
  const timeoutRef = useRef(null);

  useEffect(() => {
    if (user && user.userType !== "rider") {
      router.push("/dashboard");
      return;
    }
    fetchAvailableRides();
    fetchMyRides();
  }, [user, router]);

  useEffect(() => {
    if (user && user.availabilityStatus) {
      setAvailabilityStatus(user.availabilityStatus);
    }
  }, [user]);

  // Auto-refresh effect
  useEffect(() => {
    if (autoRefresh && activeTab === "available") {
      // Clear existing interval
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }

      // Set up new interval for auto-refresh every 30 seconds
      intervalRef.current = setInterval(() => {
        fetchAvailableRides(true); // Pass true to indicate it's an auto-refresh
      }, 30000);

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    } else {
      // Clear interval when auto-refresh is disabled or not on available tab
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }
  }, [autoRefresh, activeTab]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const fetchAvailableRides = useCallback(
    async (isAutoRefresh = false) => {
      const token = Cookies.get("token", { path: "/" });
      if (!token) return;
      // Don't show loading spinner for auto-refresh
      if (!isAutoRefresh) {
        setLoading(true);
      }

      try {
        const data = await rideAPI.getAvailableRides();

        // Compare with current rides to show notification for new rides
        if (isAutoRefresh && availableRides.length > 0) {
          const currentRideIds = availableRides.map((ride) => ride.id);
          const newRides = data.filter(
            (ride) => !currentRideIds.includes(ride.id)
          );

          if (newRides.length > 0) {
            toast({
              title: "New Ride Request!",
              description: `${newRides.length} new ride request${
                newRides.length > 1 ? "s" : ""
              } available`,
              duration: 5000,
            });
          }
        }

        setAvailableRides(data);
        setLastRefresh(new Date());
      } catch (error) {
        // Only show error toast if it's not an auto-refresh to avoid spam
        if (!isAutoRefresh) {
          toast({
            title: "Error",
            description: "Failed to fetch available rides",
            variant: "destructive",
          });
        }
      } finally {
        if (!isAutoRefresh) {
          setLoading(false);
        }
      }
    },
    [availableRides, toast]
  );

  const fetchMyRides = async () => {
    try {
      const token = Cookies.get("token", { path: "/" });
      if (!token) return;
      const data = await rideAPI.getMyRiderRides();
      setMyRides(data);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch your rides",
        variant: "destructive",
      });
    }
  };

  const handleRideAction = async (rideId, action) => {
    setActionLoading((prev) => ({ ...prev, [rideId]: true }));

    try {
      await rideAPI.updateRideStatus(rideId, action);
      toast({
        title: "Success",
        description: `Ride ${action} successfully`,
      });

      // Refresh both lists immediately after action
      await Promise.all([fetchAvailableRides(), fetchMyRides()]);
    } catch (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setActionLoading((prev) => ({ ...prev, [rideId]: false }));
    }
  };

  const handleAvailabilityChange = async (newStatus) => {
    setStatusLoading(true);
    try {
      await rideAPI.updateRiderAvailability(newStatus);
      setAvailabilityStatus(newStatus);
      toast({
        title: "Status Updated",
        description: `Your availability is now ${newStatus}`,
      });

      // Refresh available rides when availability changes
      if (newStatus === "available") {
        fetchAvailableRides();
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setStatusLoading(false);
    }
  };

  const handleManualRefresh = () => {
    if (activeTab === "available") {
      fetchAvailableRides();
    } else {
      fetchMyRides();
    }
  };

  const getAvailableActions = (status) => {
    switch (status) {
      case "requested":
        return ["accepted", "rejected"];
      case "accepted":
        return ["in-progress"];
      case "in-progress":
        return ["completed"];
      default:
        return [];
    }
  };

  const formatTimeAgo = (date) => {
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);

    if (diffInSeconds < 60) return `${diffInSeconds}s ago`;
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    return `${Math.floor(diffInSeconds / 3600)}h ago`;
  };

  if (user && user.userType !== "rider") {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />

      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Rider Dashboard</h1>
          <p className="text-gray-600">
            Accept ride requests and manage your trips
          </p>
        </div>

        <div className="mb-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Availability Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-3 h-3 rounded-full ${
                      availabilityStatus === "available"
                        ? "bg-green-500"
                        : availabilityStatus === "busy"
                        ? "bg-yellow-500"
                        : "bg-red-500"
                    }`}
                  ></div>
                  <span className="font-medium capitalize">
                    {availabilityStatus}
                  </span>
                </div>
                <Select
                  value={availabilityStatus}
                  onValueChange={handleAvailabilityChange}
                  disabled={statusLoading}
                >
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="available">Available</SelectItem>
                    <SelectItem value="busy">Busy</SelectItem>
                    <SelectItem value="offline">Offline</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tab Navigation with refresh controls */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg w-fit">
              <button
                onClick={() => setActiveTab("available")}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === "available"
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Available Rides
              </button>
              <button
                onClick={() => setActiveTab("my-rides")}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === "my-rides"
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                My Rides
              </button>
            </div>

            <div className="flex items-center gap-4">
              {activeTab === "available" && (
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-2 text-sm text-gray-600">
                    <input
                      type="checkbox"
                      checked={autoRefresh}
                      onChange={(e) => setAutoRefresh(e.target.checked)}
                      className="rounded"
                    />
                    Auto-refresh
                  </label>
                  <span className="text-xs text-gray-500">
                    Last updated: {formatTimeAgo(lastRefresh)}
                  </span>
                </div>
              )}

              <Button
                variant="outline"
                size="sm"
                onClick={handleManualRefresh}
                disabled={loading}
              >
                <RefreshCw
                  className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`}
                />
                Refresh
              </Button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <div className="grid gap-6">
            {activeTab === "available" && (
              <>
                {availableRides.length === 0 ? (
                  <Card>
                    <CardContent className="py-8">
                      <p className="text-center text-gray-500">
                        No available rides at the moment
                      </p>
                      <p className="text-center text-sm text-gray-400 mt-2">
                        {autoRefresh
                          ? "Auto-refreshing every 30 seconds..."
                          : "Enable auto-refresh to check for new rides"}
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  availableRides.map((ride) => (
                    <Card
                      key={ride.id}
                      className="hover:shadow-md transition-shadow"
                    >
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle className="flex items-center gap-2">
                            {React.createElement(rideTypeIcons[ride.rideType], {
                              className: "h-5 w-5",
                            })}
                            Ride Request #{ride.id}
                          </CardTitle>
                          <Badge className={statusColors[ride.status]}>
                            {ride.status.replace("-", " ").toUpperCase()}
                          </Badge>
                        </div>
                        <CardDescription>
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            Requested{" "}
                            {new Date(ride.createdAt).toLocaleString()}
                          </div>
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-4">
                            <div>
                              <h4 className="font-semibold mb-2">
                                Trip Details
                              </h4>
                              <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                  <MapPin className="h-4 w-4 text-green-600" />
                                  <span className="text-sm">
                                    From: {ride.pickup}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <MapPin className="h-4 w-4 text-red-600" />
                                  <span className="text-sm">
                                    To: {ride.dropoff}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  {React.createElement(
                                    rideTypeIcons[ride.rideType],
                                    { className: "h-4 w-4" }
                                  )}
                                  <span className="text-sm capitalize">
                                    {ride.rideType}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="space-y-4">
                            <div>
                              <h4 className="font-semibold mb-2">
                                Passenger Details
                              </h4>
                              <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                  <User className="h-4 w-4" />
                                  <span className="text-sm">
                                    {ride.customerName}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Phone className="h-4 w-4" />
                                  <span className="text-sm">
                                    {ride.customerPhone}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {ride.status === "requested" && (
                              <div>
                                <h4 className="font-semibold mb-2">Actions</h4>
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    onClick={() =>
                                      handleRideAction(ride.id, "accepted")
                                    }
                                    disabled={actionLoading[ride.id]}
                                  >
                                    {actionLoading[ride.id]
                                      ? "Processing..."
                                      : "Accept"}
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() =>
                                      handleRideAction(ride.id, "rejected")
                                    }
                                    disabled={actionLoading[ride.id]}
                                  >
                                    {actionLoading[ride.id]
                                      ? "Processing..."
                                      : "Reject"}
                                  </Button>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </>
            )}

            {activeTab === "my-rides" && (
              <>
                {myRides.length === 0 ? (
                  <Card>
                    <CardContent className="py-8">
                      <p className="text-center text-gray-500">
                        You haven't accepted any rides yet
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  myRides.map((ride) => (
                    <Card key={ride.id}>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle className="flex items-center gap-2">
                            {React.createElement(rideTypeIcons[ride.rideType], {
                              className: "h-5 w-5",
                            })}
                            Ride #{ride.id}
                          </CardTitle>
                          <Badge className={statusColors[ride.status]}>
                            {ride.status.replace("-", " ").toUpperCase()}
                          </Badge>
                        </div>
                        <CardDescription>
                          Accepted on{" "}
                          {new Date(
                            ride.acceptedAt || ride.createdAt
                          ).toLocaleString()}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-4">
                            <div>
                              <h4 className="font-semibold mb-2">
                                Trip Details
                              </h4>
                              <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                  <MapPin className="h-4 w-4 text-green-600" />
                                  <span className="text-sm">
                                    From: {ride.pickup}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <MapPin className="h-4 w-4 text-red-600" />
                                  <span className="text-sm">
                                    To: {ride.dropoff}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  {React.createElement(
                                    rideTypeIcons[ride.rideType],
                                    { className: "h-4 w-4" }
                                  )}
                                  <span className="text-sm capitalize">
                                    {ride.rideType}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="space-y-4">
                            <div>
                              <h4 className="font-semibold mb-2">
                                Passenger Details
                              </h4>
                              <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                  <User className="h-4 w-4" />
                                  <span className="text-sm">
                                    {ride.customerName}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Phone className="h-4 w-4" />
                                  <span className="text-sm">
                                    {ride.customerPhone}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div>
                              <h4 className="font-semibold mb-2">Actions</h4>
                              <div className="flex gap-2 flex-wrap">
                                {getAvailableActions(ride.status).map(
                                  (action) => (
                                    <Button
                                      key={action}
                                      size="sm"
                                      onClick={() =>
                                        handleRideAction(ride.id, action)
                                      }
                                      disabled={actionLoading[ride.id]}
                                    >
                                      {actionLoading[ride.id]
                                        ? "Processing..."
                                        : action
                                            .replace("-", " ")
                                            .toUpperCase()}
                                    </Button>
                                  )
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
