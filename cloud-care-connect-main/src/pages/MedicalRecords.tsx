import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FileText, Upload, Download, Eye, Trash2, Plus, FileImage, FileVideo, File } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface MedicalRecord {
  id: string;
  patient_id: string;
  title: string;
  description: string;
  document_type: string;
  file_url: string;
  file_name: string;
  file_size: number;
  uploaded_by: string;
  created_at: string;
}

const MedicalRecords = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [documentType, setDocumentType] = useState("lab_report");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const queryClient = useQueryClient();

  const { data: records = [], isLoading } = useQuery({
    queryKey: ["medical_records"],
    queryFn: async (): Promise<MedicalRecord[]> => {
      const { data, error } = await supabase
        .from("medical_records")
        .select(`
          *,
          patients (
            first_name,
            last_name
          )
        `)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as MedicalRecord[];
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

  const uploadFileMutation = useMutation({
    mutationFn: async (fileData: { file: File; patientId: string; title: string; description: string; documentType: string }) => {
      // Upload file to Supabase Storage
      const fileExt = fileData.file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `medical-records/${fileName}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('medical-records')
        .upload(filePath, fileData.file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('medical-records')
        .getPublicUrl(filePath);

      // Create record in database
      const { data, error } = await supabase
        .from("medical_records")
        .insert({
          patient_id: fileData.patientId,
          title: fileData.title,
          description: fileData.description,
          document_type: fileData.documentType,
          file_url: publicUrl,
          file_name: fileData.file.name,
          file_size: fileData.file.size,
          uploaded_by: "current_user", // This should be the actual user ID
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["medical_records"] });
      toast.success("Medical record uploaded successfully!");
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast.error("Failed to upload medical record: " + error.message);
    },
  });

  const deleteRecordMutation = useMutation({
    mutationFn: async (record: MedicalRecord) => {
      // Delete file from storage
      const filePath = record.file_url.split('/').pop();
      if (filePath) {
        await supabase.storage
          .from('medical-records')
          .remove([`medical-records/${filePath}`]);
      }

      // Delete record from database
      const { error } = await supabase
        .from("medical_records")
        .delete()
        .eq("id", record.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["medical_records"] });
      toast.success("Medical record deleted successfully!");
    },
    onError: (error) => {
      toast.error("Failed to delete medical record");
    },
  });

  const resetForm = () => {
    setSelectedPatient("");
    setTitle("");
    setDescription("");
    setDocumentType("lab_report");
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient || !title || !selectedFile) {
      toast.error("Please fill in all required fields and select a file");
      return;
    }

    uploadFileMutation.mutate({
      file: selectedFile,
      patientId: selectedPatient,
      title,
      description,
      documentType,
    });
  };

  const handleDownload = (record: MedicalRecord) => {
    window.open(record.file_url, '_blank');
  };

  const handleDelete = (record: MedicalRecord) => {
    if (confirm("Are you sure you want to delete this medical record?")) {
      deleteRecordMutation.mutate(record);
    }
  };

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'pdf':
        return <FileText className="h-4 w-4" />;
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
        return <FileImage className="h-4 w-4" />;
      case 'mp4':
      case 'avi':
      case 'mov':
        return <FileVideo className="h-4 w-4" />;
      default:
        return <File className="h-4 w-4" />;
    }
  };

  const getDocumentTypeLabel = (type: string) => {
    switch (type) {
      case "lab_report": return "Lab Report";
      case "xray": return "X-Ray";
      case "mri": return "MRI";
      case "ct_scan": return "CT Scan";
      case "prescription": return "Prescription";
      case "discharge_summary": return "Discharge Summary";
      case "other": return "Other";
      default: return type;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <DashboardLayout>
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold font-display text-foreground">Medical Records</h1>
            <p className="text-sm text-muted-foreground mt-1">Upload and manage patient medical documents</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Upload Document
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Upload Medical Record</DialogTitle>
                <DialogDescription>
                  Upload a medical document for a patient.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
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
                  <Label htmlFor="title">Document Title *</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g., Blood Test Results"
                  />
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Additional notes about the document"
                  />
                </div>

                <div>
                  <Label htmlFor="documentType">Document Type</Label>
                  <Select value={documentType} onValueChange={setDocumentType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="lab_report">Lab Report</SelectItem>
                      <SelectItem value="xray">X-Ray</SelectItem>
                      <SelectItem value="mri">MRI</SelectItem>
                      <SelectItem value="ct_scan">CT Scan</SelectItem>
                      <SelectItem value="prescription">Prescription</SelectItem>
                      <SelectItem value="discharge_summary">Discharge Summary</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="file">File *</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="file"
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileSelect}
                      accept=".pdf,.jpg,.jpeg,.png,.gif,.mp4,.avi,.mov"
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload className="h-4 w-4" />
                    </Button>
                  </div>
                  {selectedFile && (
                    <p className="text-sm text-muted-foreground mt-1">
                      Selected: {selectedFile.name} ({formatFileSize(selectedFile.size)})
                    </p>
                  )}
                </div>

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={uploadFileMutation.isPending}>
                    {uploadFileMutation.isPending ? "Uploading..." : "Upload Document"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {isLoading ? (
          <div className="text-center py-8">Loading medical records...</div>
        ) : records.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No medical records yet</h3>
              <p className="text-muted-foreground text-center mb-4">
                Upload your first medical document to get started.
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>All Medical Records</CardTitle>
              <CardDescription>View and manage patient medical documents</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Document</TableHead>
                    <TableHead>Patient</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead>Uploaded</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getFileIcon(record.file_name)}
                          <div>
                            <p className="font-medium">{record.title}</p>
                            <p className="text-sm text-muted-foreground">{record.description}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {(record as any).patients?.first_name} {(record as any).patients?.last_name}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{getDocumentTypeLabel(record.document_type)}</Badge>
                      </TableCell>
                      <TableCell>{formatFileSize(record.file_size)}</TableCell>
                      <TableCell>
                        {format(new Date(record.created_at), "MMM dd, yyyy")}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDownload(record)}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDelete(record)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
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

export default MedicalRecords;