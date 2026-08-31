import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Spinner } from "@/components/ui/spinner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { ImageUpload } from "@/components/ui/ImageUpload";

export default function EventManagementPage() {
  const { user } = useAuth();
  const [newEvent, setNewEvent] = useState({
    title: "",
    description: "",
    eventDate: "",
    location: "",
    eventImage: "",
  });

  // Queries
  const { data: events, isLoading, isError, refetch: refetchEvents } = trpc.event.adminGetAll.useQuery();

  // Mutations
  const createEventMutation = trpc.event.create.useMutation({
    onSuccess: () => {
      toast.success("Event created successfully!");
      setNewEvent({ title: "", description: "", eventDate: "", location: "", eventImage: "" });
      refetchEvents();
    },
    onError: (error) => toast.error(`Error: ${error.message}`),
  });

  const updateStatusMutation = trpc.event.updateStatus.useMutation({
    onSuccess: () => {
      toast.success("Event status updated");
      refetchEvents();
    },
  });

  const handleCreate = () => {
    if (!newEvent.title || !newEvent.eventDate || !newEvent.location) {
      toast.error("Please fill in required fields (Title, Date, Location)");
      return;
    }
    createEventMutation.mutate({
      title: newEvent.title,
      description: newEvent.description,
      location: newEvent.location,
      eventDate: new Date(newEvent.eventDate),
      eventImage: newEvent.eventImage || undefined,
    });
  };

  if (user?.role !== "admin") return <div className="p-6">Access Denied</div>;

  if (isError) {
    return <div className="flex items-center justify-center h-64 text-red-500">Failed to load events. <button className="underline ml-1" onClick={() => window.location.reload()}>Retry</button></div>;
  }

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><Spinner className="size-6 text-gray-400" /></div>;
  }

  return (
    <div className="space-y-6 p-6">
      <Card>
        <CardHeader>
          <CardTitle>Schedule New Event</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <ImageUpload
            label="Event Cover Image"
            value={newEvent.eventImage}
            defaultAspectRatio="video"
            onChange={(url: string) => setNewEvent({ ...newEvent, eventImage: url })}
          />
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Event Title</label>
              <Input
                value={newEvent.title}
                onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                placeholder="e.g., Annual Health Camp"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Location</label>
              <Input
                value={newEvent.location}
                onChange={(e) => setNewEvent({ ...newEvent, location: e.target.value })}
                placeholder="e.g., City Center Plaza"
              />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium">Description</label>
            <Input
              value={newEvent.description}
              onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
              placeholder="What is this event about?"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Event Date</label>
            <Input
              type="datetime-local"
              value={newEvent.eventDate}
              onChange={(e) => setNewEvent({ ...newEvent, eventDate: e.target.value })}
            />
          </div>
          <Button onClick={handleCreate} className="w-full" disabled={createEventMutation.isPending}>
            {createEventMutation.isPending ? "Scheduling..." : "Schedule Event"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Manage Events</CardTitle>
        </CardHeader>
        <CardContent>
          {events && events.length > 0 ? (
            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
              {events.map((event) => (
                <div key={event.id} className="border p-4 rounded-lg bg-white flex gap-4 justify-between items-start hover:border-gray-400 transition">
                  <div className="flex gap-4">
                    {event.eventImage ? (
                      <img src={event.eventImage} alt={event.title} className="w-24 h-20 object-cover rounded border" />
                    ) : (
                      <div className="w-24 h-20 bg-gray-100 flex items-center justify-center text-gray-400 border rounded flex-shrink-0">
                        No Image
                      </div>
                    )}
                    <div>
                      <h3 className="font-bold text-lg text-gray-900">{event.title}</h3>
                      <p className="text-sm text-gray-500">
                        {format(new Date(event.eventDate), "PPP p")} • {event.location}
                      </p>
                      <p className="text-gray-700 text-sm mt-2 line-clamp-2">{event.description}</p>
                    </div>
                  </div>
                  <Select
                    value={event.status}
                    onValueChange={(val: any) => updateStatusMutation.mutate({ id: event.id, status: val })}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="upcoming">Upcoming</SelectItem>
                      <SelectItem value="ongoing">Ongoing</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">No events scheduled yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
