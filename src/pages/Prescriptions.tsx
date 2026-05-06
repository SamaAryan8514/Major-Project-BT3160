import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pill, Calendar, User } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface Prescription {
  id: string;
  patient_id: string;
  doctor_id: string;
  prescription_id: string;
  medications: any[];
  diagnosis: string;
  notes: string;
  created_at: string;
  patients: {
    first_name: string;
    last_name: string;
  };
  doctors: {
    first_name: string;
    last_name: string;
  };
}

const Prescriptions = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState("");
  const [selectedDoctor, setSelectedDoctor] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [notes, setNotes] = useState("");
  const [medications, setMedications] = useState([{ name: "", dosage: "", frequency: "", duration: "" }]);

  const queryClient = useQueryClient();

  const { data: prescriptions = [], isLoading } = useQuery({
    queryKey: ["prescriptions"],
    queryFn: async (): Promise<Prescription[]> => {
      const { data, error } = await supabase
        .from("prescriptions")
        .select(`
          *,
          patients(first_name, last_name),
          doctors(first_name, last_name)
        `)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Prescription[];
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

  const createPrescriptionMutation = useMutation({
    mutationFn: async (prescriptionData: any) => {
      const prescriptionId = `RX-${Date.now()}`;
      const { data, error } = await supabase
        .from("prescriptions")
        .insert({
          prescription_id: prescriptionId,
          patient_id: prescriptionData.patient_id,
          doctor_id: prescriptionData.doctor_id,
          medications: prescriptionData.medications,
          diagnosis: prescriptionData.diagnosis,
          notes: prescriptionData.notes,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prescriptions"] });
      toast.success("Prescription created successfully!");
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast.error("Failed to create prescription: " + error.message);
    },
  });

  const resetForm = () => {
    setSelectedPatient("");
    setSelectedDoctor("");
    setDiagnosis("");
    setNotes("");
    setMedications([{ name: "", dosage: "", frequency: "", duration: "" }]);
  };

  const addMedication = () => {
    setMedications([...medications, { name: "", dosage: "", frequency: "", duration: "" }]);
  };

  const updateMedication = (index: number, field: string, value: string) => {
    const updated = [...medications];
    updated[index][field] = value;
    setMedications(updated);
  };

  const removeMedication = (index: number) => {
    setMedications(medications.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient || !selectedDoctor || !diagnosis) {
      toast.error("Please fill in all required fields");
      return;
    }

    createPrescriptionMutation.mutate({
      patient_id: selectedPatient,
      doctor_id: selectedDoctor,
      medications: medications.filter(med => med.name.trim() !== ""),
      diagnosis,
      notes,
    });
  };

  return (
    <DashboardLayout>
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold font-display text-foreground">Prescriptions</h1>
            <p className="text-sm text-muted-foreground mt-1">Manage patient prescriptions and medications</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Prescription
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create New Prescription</DialogTitle>
                <DialogDescription>
                  Create a prescription for a patient with medications and instructions.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="patient">Patient *</Label>
                    <Select value={selectedPatient} onValueChange={setSelectedPatient}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select patient" />
                      </SelectTrigger>
                      <SelectContent>
                        {patients.map((patient) => (
                          <SelectItem key={patient.id} value={patient.id}>
                            {patient.first_name} {patient.last_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="doctor">Doctor *</Label>
                    <Select value={selectedDoctor} onValueChange={setSelectedDoctor}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select doctor" />
                      </SelectTrigger>
                      <SelectContent>
                        {doctors.map((doctor) => (
                          <SelectItem key={doctor.id} value={doctor.id}>
                            Dr. {doctor.first_name} {doctor.last_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="diagnosis">Diagnosis *</Label>
                  <Input
                    id="diagnosis"
                    value={diagnosis}
                    onChange={(e) => setDiagnosis(e.target.value)}
                    placeholder="Enter diagnosis"
                  />
                </div>

                <div>
                  <Label>Medications</Label>
                  <div className="space-y-2">
                    {medications.map((med, index) => (
                      <div key={index} className="grid grid-cols-5 gap-2 p-3 border rounded-lg">
                        <Input
                          placeholder="Medication name"
                          value={med.name}
                          onChange={(e) => updateMedication(index, "name", e.target.value)}
                        />
                        <Input
                          placeholder="Dosage"
                          value={med.dosage}
                          onChange={(e) => updateMedication(index, "dosage", e.target.value)}
                        />
                        <Input
                          placeholder="Frequency"
                          value={med.frequency}
                          onChange={(e) => updateMedication(index, "frequency", e.target.value)}
                        />
                        <Input
                          placeholder="Duration"
                          value={med.duration}
                          onChange={(e) => updateMedication(index, "duration", e.target.value)}
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          onClick={() => removeMedication(index)}
                          disabled={medications.length === 1}
                        >
                          Remove
                        </Button>
                      </div>
                    ))}
                    <Button type="button" variant="outline" onClick={addMedication}>
                      Add Medication
                    </Button>
                  </div>
                </div>

                <div>
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Additional notes or instructions"
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createPrescriptionMutation.isPending}>
                    {createPrescriptionMutation.isPending ? "Creating..." : "Create Prescription"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {isLoading ? (
          <div className="text-center py-8">Loading prescriptions...</div>
        ) : prescriptions.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Pill className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No prescriptions yet</h3>
              <p className="text-muted-foreground text-center mb-4">
                Create your first prescription to get started.
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Recent Prescriptions</CardTitle>
              <CardDescription>View and manage patient prescriptions</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Prescription ID</TableHead>
                    <TableHead>Patient</TableHead>
                    <TableHead>Doctor</TableHead>
                    <TableHead>Diagnosis</TableHead>
                    <TableHead>Medications</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {prescriptions.map((prescription) => (
                    <TableRow key={prescription.id}>
                      <TableCell className="font-medium">{prescription.prescription_id}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4" />
                          {prescription.patients?.first_name} {prescription.patients?.last_name}
                        </div>
                      </TableCell>
                      <TableCell>
                        Dr. {prescription.doctors?.first_name} {prescription.doctors?.last_name}
                      </TableCell>
                      <TableCell>{prescription.diagnosis}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {prescription.medications?.slice(0, 2).map((med: any, index: number) => (
                            <Badge key={index} variant="secondary" className="text-xs">
                              {med.name}
                            </Badge>
                          ))}
                          {prescription.medications?.length > 2 && (
                            <Badge variant="outline" className="text-xs">
                              +{prescription.medications.length - 2} more
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          {format(new Date(prescription.created_at), "MMM dd, yyyy")}
                        </div>
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

export default Prescriptions;