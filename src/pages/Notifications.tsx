import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Bell, Plus, Clock, AlertTriangle, CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  priority: string;
  status: string;
  recipient_id: string;
  recipient_type: string;
  created_at: string;
  scheduled_for: string | null;
  sent_at: string | null;
  read_at: string | null;
}

const Notifications = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [type, setType] = useState("appointment_reminder");
  const [priority, setPriority] = useState("medium");
  const [recipientType, setRecipientType] = useState("patient");
  const [recipientId, setRecipientId] = useState("");

  const queryClient = useQueryClient();

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ["notifications"],
    queryFn: async (): Promise<Notification[]> => {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Notification[];
    },
  });

  const { data: patients = [] } = useQuery({
    queryKey: ["patients"],
    queryFn: async () => {
      const { data, error } = await supabase.from("patients").select("*");
      if (error) throw error;
      return data;
    },
  });

  const { data: doctors = [] } = useQuery({
    queryKey: ["doctors"],
    queryFn: async () => {
      const { data, error } = await supabase.from("doctors").select("*");
      if (error) throw error;
      return data;
    },
  });

  const createNotificationMutation = useMutation({
    mutationFn: async (notificationData: any) => {
      const { data, error } = await supabase
        .from("notifications")
        .insert({
          title: notificationData.title,
          message: notificationData.message,
          type: notificationData.type,
          priority: notificationData.priority,
          recipient_id: notificationData.recipient_id,
          recipient_type: notificationData.recipient_type,
          status: "pending",
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      toast.success("Notification created successfully!");
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast.error("Failed to create notification: " + error.message);
    },
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from("notifications")
        .update({ read_at: new Date().toISOString(), status: "read" })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      toast.success("Notification marked as read!");
    },
    onError: (error) => {
      toast.error("Failed to mark notification as read");
    },
  });

  const resetForm = () => {
    setTitle("");
    setMessage("");
    setType("appointment_reminder");
    setPriority("medium");
    setRecipientType("patient");
    setRecipientId("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !message || !recipientId) {
      toast.error("Please fill in all required fields");
      return;
    }

    createNotificationMutation.mutate({
      title,
      message,
      type,
      priority,
      recipient_id: recipientId,
      recipient_type: recipientType,
    });
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high": return "destructive";
      case "medium": return "default";
      case "low": return "secondary";
      default: return "default";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "read": return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "sent": return <Clock className="h-4 w-4 text-blue-500" />;
      case "failed": return <XCircle className="h-4 w-4 text-red-500" />;
      default: return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "appointment_reminder": return "Appointment Reminder";
      case "medication_reminder": return "Medication Reminder";
      case "test_results": return "Test Results";
      case "billing": return "Billing";
      case "emergency": return "Emergency";
      default: return type;
    }
  };

  const recipients = recipientType === "patient" ? patients : doctors;

  return (
    <DashboardLayout>
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold font-display text-foreground">Notifications</h1>
            <p className="text-sm text-muted-foreground mt-1">Manage notifications and reminders</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Send Notification
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Send New Notification</DialogTitle>
                <DialogDescription>
                  Create and send a notification to a patient or doctor.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Notification title"
                  />
                </div>

                <div>
                  <Label htmlFor="message">Message *</Label>
                  <Textarea
                    id="message"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Notification message"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="type">Type</Label>
                    <Select value={type} onValueChange={setType}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="appointment_reminder">Appointment Reminder</SelectItem>
                        <SelectItem value="medication_reminder">Medication Reminder</SelectItem>
                        <SelectItem value="test_results">Test Results</SelectItem>
                        <SelectItem value="billing">Billing</SelectItem>
                        <SelectItem value="emergency">Emergency</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="priority">Priority</Label>
                    <Select value={priority} onValueChange={setPriority}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="recipientType">Recipient Type</Label>
                    <Select value={recipientType} onValueChange={(value) => {
                      setRecipientType(value);
                      setRecipientId("");
                    }}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="patient">Patient</SelectItem>
                        <SelectItem value="doctor">Doctor</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="recipient">Recipient *</Label>
                    <Select value={recipientId} onValueChange={setRecipientId}>
                      <SelectTrigger>
                        <SelectValue placeholder={`Select ${recipientType}`} />
                      </SelectTrigger>
                      <SelectContent>
                        {recipients.map((person) => (
                          <SelectItem key={person.id} value={person.id}>
                            {person.first_name} {person.last_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createNotificationMutation.isPending}>
                    {createNotificationMutation.isPending ? "Sending..." : "Send Notification"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {isLoading ? (
          <div className="text-center py-8">Loading notifications...</div>
        ) : notifications.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Bell className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No notifications yet</h3>
              <p className="text-muted-foreground text-center mb-4">
                Send your first notification to get started.
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>All Notifications</CardTitle>
              <CardDescription>View and manage all notifications</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Recipient</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {notifications.map((notification) => (
                    <TableRow key={notification.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(notification.status)}
                          <span className="capitalize">{notification.status}</span>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">{notification.title}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{getTypeLabel(notification.type)}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getPriorityColor(notification.priority)}>
                          {notification.priority}
                        </Badge>
                      </TableCell>
                      <TableCell>{notification.recipient_type}</TableCell>
                      <TableCell>
                        {format(new Date(notification.created_at), "MMM dd, yyyy HH:mm")}
                      </TableCell>
                      <TableCell>
                        {notification.status === "pending" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => markAsReadMutation.mutate(notification.id)}
                          >
                            Mark as Read
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Notifications;