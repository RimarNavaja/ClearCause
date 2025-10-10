import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Target, Plus, CheckCircle, Clock, AlertTriangle, Edit, Upload } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import CharityLayout from '@/components/layout/CharityLayout';
import { formatCurrency } from '@/utils/helpers';

interface Milestone {
  id: string;
  campaignId: string;
  campaignTitle: string;
  title: string;
  description: string;
  targetAmount: number;
  status: 'pending' | 'in_progress' | 'completed' | 'verified';
  verificationStatus: 'pending' | 'under_review' | 'approved' | 'rejected';
  dueDate: string;
  completedAt?: string;
}

const CharityMilestones: React.FC = () => {
  // Mock data - replace with actual API call
  const [milestones] = useState<Milestone[]>([
    {
      id: '1',
      campaignId: '1',
      campaignTitle: 'Clean Water Project',
      title: 'Initial Assessment and Planning',
      description: 'Complete site assessment and develop implementation plan',
      targetAmount: 25000,
      status: 'completed',
      verificationStatus: 'approved',
      dueDate: '2025-01-15',
      completedAt: '2025-01-14',
    },
    {
      id: '2',
      campaignId: '1',
      campaignTitle: 'Clean Water Project',
      title: 'Equipment Procurement',
      description: 'Purchase water pumps and filtration systems',
      targetAmount: 50000,
      status: 'in_progress',
      verificationStatus: 'pending',
      dueDate: '2025-02-15',
    },
    {
      id: '3',
      campaignId: '1',
      campaignTitle: 'Clean Water Project',
      title: 'Installation and Training',
      description: 'Install equipment and train local community',
      targetAmount: 25000,
      status: 'pending',
      verificationStatus: 'pending',
      dueDate: '2025-03-15',
    },
  ]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Completed</Badge>;
      case 'in_progress':
        return <Badge className="bg-blue-100 text-blue-800"><Clock className="w-3 h-3 mr-1" />In Progress</Badge>;
      case 'pending':
        return <Badge variant="outline"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      case 'verified':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Verified</Badge>;
      default:
        return null;
    }
  };

  const getVerificationBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-100 text-green-800">✓ Verified</Badge>;
      case 'under_review':
        return <Badge className="bg-yellow-100 text-yellow-800">Under Review</Badge>;
      case 'rejected':
        return <Badge className="bg-red-100 text-red-800">Rejected</Badge>;
      case 'pending':
        return <Badge variant="outline">Not Submitted</Badge>;
      default:
        return null;
    }
  };

  const completedMilestones = milestones.filter((m) => m.status === 'completed');
  const activeMilestones = milestones.filter((m) => m.status === 'in_progress');
  const pendingMilestones = milestones.filter((m) => m.status === 'pending');

  return (
    <CharityLayout title="Milestones">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Campaign Milestones</h1>
            <p className="text-gray-600">Define, track, and submit proof for your campaign milestones</p>
          </div>
          <Button asChild>
            <Link to="/charity/campaigns">
              <Plus className="w-4 h-4 mr-2" />
              Add Milestone
            </Link>
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Total Milestones</p>
                  <p className="text-2xl font-bold">{milestones.length}</p>
                </div>
                <Target className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">In Progress</p>
                  <p className="text-2xl font-bold">{activeMilestones.length}</p>
                </div>
                <Clock className="h-8 w-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Completed</p>
                  <p className="text-2xl font-bold">{completedMilestones.length}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Verified</p>
                  <p className="text-2xl font-bold">
                    {milestones.filter((m) => m.verificationStatus === 'approved').length}
                  </p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Milestones Tabs */}
        <Card>
          <CardHeader>
            <CardTitle>All Milestones</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="all">
              <TabsList>
                <TabsTrigger value="all">All ({milestones.length})</TabsTrigger>
                <TabsTrigger value="active">Active ({activeMilestones.length})</TabsTrigger>
                <TabsTrigger value="completed">Completed ({completedMilestones.length})</TabsTrigger>
                <TabsTrigger value="pending">Pending ({pendingMilestones.length})</TabsTrigger>
              </TabsList>

              <TabsContent value="all" className="mt-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Campaign</TableHead>
                      <TableHead>Milestone</TableHead>
                      <TableHead>Target Amount</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Verification</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {milestones.map((milestone) => (
                      <TableRow key={milestone.id}>
                        <TableCell className="font-medium">{milestone.campaignTitle}</TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{milestone.title}</p>
                            <p className="text-sm text-gray-500">{milestone.description}</p>
                          </div>
                        </TableCell>
                        <TableCell>{formatCurrency(milestone.targetAmount)}</TableCell>
                        <TableCell>{new Date(milestone.dueDate).toLocaleDateString()}</TableCell>
                        <TableCell>{getStatusBadge(milestone.status)}</TableCell>
                        <TableCell>{getVerificationBadge(milestone.verificationStatus)}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            {milestone.status === 'completed' && milestone.verificationStatus === 'pending' && (
                              <Button variant="outline" size="sm" asChild>
                                <Link to={`/charity/campaigns/${milestone.campaignId}/milestones/${milestone.id}/submit`}>
                                  <Upload className="w-4 h-4 mr-1" />
                                  Submit Proof
                                </Link>
                              </Button>
                            )}
                            <Button variant="ghost" size="sm" asChild>
                              <Link to={`/charity/campaigns/${milestone.campaignId}/milestones`}>
                                <Edit className="w-4 h-4" />
                              </Link>
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TabsContent>

              <TabsContent value="active">
                <div className="space-y-4">
                  {activeMilestones.length === 0 ? (
                    <p className="text-center text-gray-500 py-8">No active milestones</p>
                  ) : (
                    activeMilestones.map((milestone) => (
                      <div key={milestone.id} className="border rounded-lg p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-semibold">{milestone.title}</h4>
                            <p className="text-sm text-gray-600">{milestone.campaignTitle}</p>
                            <p className="text-sm text-gray-500 mt-1">{milestone.description}</p>
                            <div className="mt-3">
                              <div className="flex justify-between text-sm mb-1">
                                <span>Progress to target</span>
                                <span>{formatCurrency(milestone.targetAmount)}</span>
                              </div>
                              <Progress value={65} className="h-2" />
                            </div>
                          </div>
                          <div className="flex flex-col gap-2">
                            {getStatusBadge(milestone.status)}
                            {getVerificationBadge(milestone.verificationStatus)}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </TabsContent>

              <TabsContent value="completed">
                <div className="space-y-4">
                  {completedMilestones.length === 0 ? (
                    <p className="text-center text-gray-500 py-8">No completed milestones</p>
                  ) : (
                    completedMilestones.map((milestone) => (
                      <div key={milestone.id} className="border rounded-lg p-4 bg-green-50">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-semibold">{milestone.title}</h4>
                            <p className="text-sm text-gray-600">{milestone.campaignTitle}</p>
                            <p className="text-sm text-gray-500 mt-1">
                              Completed on {milestone.completedAt && new Date(milestone.completedAt).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex flex-col gap-2">
                            {getStatusBadge(milestone.status)}
                            {getVerificationBadge(milestone.verificationStatus)}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </TabsContent>

              <TabsContent value="pending">
                <div className="space-y-4">
                  {pendingMilestones.length === 0 ? (
                    <p className="text-center text-gray-500 py-8">No pending milestones</p>
                  ) : (
                    pendingMilestones.map((milestone) => (
                      <div key={milestone.id} className="border rounded-lg p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-semibold">{milestone.title}</h4>
                            <p className="text-sm text-gray-600">{milestone.campaignTitle}</p>
                            <p className="text-sm text-gray-500 mt-1">{milestone.description}</p>
                            <p className="text-sm text-gray-500 mt-2">
                              Due: {new Date(milestone.dueDate).toLocaleDateString()}
                            </p>
                          </div>
                          {getStatusBadge(milestone.status)}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </CharityLayout>
  );
};

export default CharityMilestones;
