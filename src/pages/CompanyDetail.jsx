import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "../utils";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Loader2 } from "lucide-react";
import CompanyHeader from "../components/company/CompanyHeader";
import OverviewTab from "../components/company/OverviewTab";
import ContactCard from "../components/company/ContactCard";

export default function CompanyDetail() {
  const queryClient = useQueryClient();
  const params = new URLSearchParams(window.location.search);
  const companyName = params.get("name");
  const companyIdParam = params.get("id");
  
  const [companyId, setCompanyId] = useState(companyIdParam);
  const [enriching, setEnriching] = useState(!companyIdParam);
  const [generatedMessages, setGeneratedMessages] = useState({});
  const [generatingContactId, setGeneratingContactId] = useState(null);

  useEffect(() => {
    if (companyName && !companyId) {
      loadOrCreateCompany();
    }
  }, [companyName, companyId]);

  const loadOrCreateCompany = async () => {
    try {
      setEnriching(true);
      const decodedName = decodeURIComponent(companyName);
      
      const companies = await base44.entities.Company.filter({ name: decodedName });
      
      let id;
      if (companies.length > 0) {
        id = companies[0].id;
        setCompanyId(id);
      } else {
        const newCompany = await base44.entities.Company.create({ name: decodedName });
        id = newCompany.id;
        setCompanyId(id);
      }

      try {
        await base44.functions.invoke('enrichCompanyIntelligence', {
          company_id: id,
          company_name: decodedName
        });
        queryClient.invalidateQueries({ queryKey: ["company", id] });
      } catch (error) {
        console.error('Enrichment failed:', error);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setEnriching(false);
    }
  };

  const { data: company, isLoading, error } = useQuery({
    queryKey: ["company", companyId],
    queryFn: () => base44.entities.Company.get(companyId),
    enabled: !!companyId,
  });

  const { data: contacts = [] } = useQuery({
    queryKey: ["contacts", companyId, companyName],
    queryFn: async () => {
      if (companyId) {
        return base44.entities.Contact.filter({ company_id: companyId });
      } else if (companyName) {
        const decodedName = decodeURIComponent(companyName);
        return base44.entities.Contact.filter({ company_name: decodedName });
      }
      return [];
    },
    enabled: !!companyId || !!companyName,
  });

  const { data: roles = [] } = useQuery({
    queryKey: ["roles", companyId, companyName],
    queryFn: async () => {
      if (companyId) {
        return base44.entities.OpenRole.filter({ company_id: companyId });
      } else if (companyName) {
        const decodedName = decodeURIComponent(companyName);
        return base44.entities.OpenRole.filter({ company_name: decodedName });
      }
      return [];
    },
    enabled: !!companyId || !!companyName,
  });

  const handleGenerateMessage = async (contact) => {
    setGeneratingContactId(contact.id);
    try {
      const response = await base44.functions.invoke('generateOutreachMessage', {
        role_title: roles[0]?.title || 'Executive Role',
        role_description: roles[0]?.description || '',
        role_salary_min: roles[0]?.salary_min,
        role_salary_max: roles[0]?.salary_max,
        company_name: company.name,
        company_industry: company.industry,
        company_description: company.description,
        contact_name: contact.full_name,
        contact_title: contact.title,
        contact_seniority: contact.seniority,
        user_background: 'Experienced executive professional'
      });

      setGeneratedMessages({
        ...generatedMessages,
        [contact.id]: response.data
      });
    } catch (error) {
      console.error('Failed to generate message:', error);
      alert('Failed to generate message');
    } finally {
      setGeneratingContactId(null);
    }
  };

  const handleManualApply = (contact, message) => {
    // TODO: Implement manual apply modal
    alert('Manual apply functionality coming soon');
  };

  if (!companyName && !companyId) {
    return (
      <div className="px-6 py-8">
        <div className="text-center py-16 text-gray-400">No company selected</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-6 py-8">
        <div className="text-center py-16">
          <p className="text-red-500 font-semibold mb-4">Failed to load company</p>
          <p className="text-gray-500 text-sm">{error.message}</p>
        </div>
      </div>
    );
  }

  if (isLoading || !company || enriching) {
    return (
      <div className="px-6 py-8">
        <div className="text-center py-16">
          <p className="text-gray-600 font-semibold">
            {enriching ? '🔬 Enriching company intelligence...' : 'Loading company...'}
          </p>
          {enriching && <p className="text-gray-400 text-sm mt-2">Gathering company data from external sources</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 py-8 space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link to={createPageUrl("Companies")} className="flex items-center gap-1 hover:text-[#F7931E] transition-colors">
          <ArrowLeft className="w-4 h-4" /> Companies
        </Link>
        <span>/</span>
        <span className="text-gray-900 font-medium">{company.name}</span>
      </div>

      {/* Header */}
      <div className="bg-white border border-gray-100 rounded-2xl p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 bg-orange-50 rounded-2xl flex items-center justify-center text-2xl font-bold text-[#F7931E] shrink-0">
              {company.match_score || "–"}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{company.name}</h1>
              {company.industry && (
                <Badge variant="secondary" className="mt-1 bg-gray-100 text-gray-600">{company.industry}</Badge>
              )}
              <div className="flex flex-wrap gap-4 mt-3 text-sm text-gray-500">
                {company.location && <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {company.location}</span>}
                {company.revenue_estimate && <span className="flex items-center gap-1"><DollarSign className="w-3.5 h-3.5" /> {company.revenue_estimate}</span>}
                {company.employee_count && <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /> {company.employee_count} employees</span>}
                {company.domain && (
                  <a href={`https://${company.domain}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-[#F7931E] hover:underline">
                    <Globe className="w-3.5 h-3.5" /> {company.domain}
                  </a>
                )}
              </div>
            </div>
          </div>
          <StatusBadge status={company.pipeline_stage || "research"} />
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList className="bg-gray-100 rounded-xl p-1">
          <TabsTrigger value="overview" className="rounded-lg data-[state=active]:bg-white">Overview</TabsTrigger>
          <TabsTrigger value="contacts" className="rounded-lg data-[state=active]:bg-white">Contacts ({contacts.length})</TabsTrigger>
          <TabsTrigger value="intelligence" className="rounded-lg data-[state=active]:bg-white">Intelligence</TabsTrigger>
          <TabsTrigger value="roles" className="rounded-lg data-[state=active]:bg-white">Open Roles ({roles.length})</TabsTrigger>
          <TabsTrigger value="outreach" className="rounded-lg data-[state=active]:bg-white">Outreach</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="mt-6 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white border border-gray-100 rounded-2xl p-6 space-y-4">
              <h3 className="font-semibold text-gray-900">Company Intelligence</h3>
              {company.description && <p className="text-sm text-gray-600">{company.description}</p>}
              <div className="grid grid-cols-2 gap-4 text-sm">
                {company.sub_sector && <div><span className="text-gray-400">Sub-sector</span><p className="font-medium">{company.sub_sector}</p></div>}
                {company.funding_stage && <div><span className="text-gray-400">Funding</span><p className="font-medium">{company.funding_stage}</p></div>}
                {company.growth_rate && <div><span className="text-gray-400">Growth</span><p className="font-medium text-emerald-600">{company.growth_rate}</p></div>}
                {company.additional_offices && <div><span className="text-gray-400">Other Offices</span><p className="font-medium">{company.additional_offices}</p></div>}
              </div>
            </div>

            <div className="bg-white border border-gray-100 rounded-2xl p-6 space-y-4">
              <h3 className="font-semibold text-gray-900">Executive Leadership</h3>
              {(company.executive_leadership || []).length > 0 ? (
                <div className="space-y-3">
                  {company.executive_leadership.map((exec, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                      <div>
                        <p className="text-sm font-medium">{exec.name || "Not identified"}</p>
                        <p className="text-xs text-gray-500">{exec.title}</p>
                      </div>
                      <span className={`text-xs font-medium ${exec.status === "open" ? "text-[#F7931E]" : "text-emerald-600"}`}>
                        {exec.status === "open" ? "🎯 Position Open" : "✓ Identified"}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-400">No leadership data available</p>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Contacts Tab */}
        <TabsContent value="contacts" className="mt-6 space-y-4">
          <div className="flex justify-between items-center">
            <Button 
              variant="outline" 
              className="rounded-xl gap-2 bg-[#F7931E] hover:bg-[#E07A0A] text-white border-[#F7931E]" 
              onClick={async () => {
                try {
                  const result = await base44.functions.invoke('findContacts', {
                    companyDomain: company.domain,
                    companyName: company.name,
                    titles: ['CEO', 'CTO', 'COO', 'CFO', 'VP', 'Director', 'Head']
                  });
                  
                  // Add found contacts to database
                  for (const contact of result.data.contacts) {
                    await base44.entities.Contact.create({
                      ...contact,
                      company_id: companyId,
                      company_name: company.name
                    });
                  }
                  
                  queryClient.invalidateQueries({ queryKey: ["contacts", companyId] });
                  alert(`Found and added ${result.data.contacts.length} contacts!`);
                } catch (error) {
                  console.error('Error finding contacts:', error);
                  alert('Failed to find contacts');
                }
              }}
            >
              <Search className="w-4 h-4" /> Auto-Find Contacts
            </Button>
            <Button variant="outline" className="rounded-xl gap-2" onClick={() => setShowAddContact(!showAddContact)}>
              <Plus className="w-4 h-4" /> Add Contact Manually
            </Button>
          </div>
          {showAddContact && (
            <div className="bg-white border border-gray-100 rounded-2xl p-6 space-y-4">
              <h3 className="font-semibold">Add Decision Maker</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input placeholder="Full Name" value={newContact.full_name} onChange={e => setNewContact(p => ({ ...p, full_name: e.target.value }))} className="rounded-xl" />
                <Input placeholder="Title (e.g. CEO)" value={newContact.title} onChange={e => setNewContact(p => ({ ...p, title: e.target.value }))} className="rounded-xl" />
                <Input placeholder="Email" value={newContact.email} onChange={e => setNewContact(p => ({ ...p, email: e.target.value }))} className="rounded-xl" />
                <Input placeholder="Phone" value={newContact.phone} onChange={e => setNewContact(p => ({ ...p, phone: e.target.value }))} className="rounded-xl" />
                <Input placeholder="LinkedIn URL" value={newContact.linkedin_url} onChange={e => setNewContact(p => ({ ...p, linkedin_url: e.target.value }))} className="rounded-xl sm:col-span-2" />
              </div>
              <Button onClick={() => addContactMutation.mutate(newContact)} className="bg-[#F7931E] hover:bg-[#E07A0A] text-white rounded-xl" disabled={addContactMutation.isPending}>
                Save Contact
              </Button>
            </div>
          )}
          {contacts.map(contact => (
            <div key={contact.id} className="bg-white border border-gray-100 rounded-2xl p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center text-sm font-bold text-gray-500">
                    {contact.full_name?.split(" ").map(n => n[0]).join("").toUpperCase()}
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">{contact.full_name}</h4>
                    <p className="text-sm text-gray-500">{contact.title}</p>
                    <div className="flex flex-wrap gap-3 mt-2 text-sm">
                      {contact.email && <span className="flex items-center gap-1 text-gray-500"><Mail className="w-3.5 h-3.5" /> {contact.email}</span>}
                      {contact.phone && <span className="flex items-center gap-1 text-gray-500"><Phone className="w-3.5 h-3.5" /> {contact.phone}</span>}
                    </div>
                  </div>
                </div>
                {contact.is_primary && <Badge className="bg-yellow-50 text-yellow-700">Primary</Badge>}
              </div>
              <div className="flex gap-2 mt-4">
                {contact.email && (
                  <Button size="sm" variant="outline" className="rounded-lg gap-1.5 text-xs" onClick={() => navigator.clipboard.writeText(contact.email)}>
                    <Copy className="w-3 h-3" /> Copy Email
                  </Button>
                )}
                {contact.linkedin_url && (
                  <a href={contact.linkedin_url} target="_blank" rel="noopener noreferrer">
                    <Button size="sm" variant="outline" className="rounded-lg gap-1.5 text-xs">
                      <Linkedin className="w-3 h-3" /> LinkedIn
                    </Button>
                  </a>
                )}
                <Button size="sm" variant="outline" className="rounded-lg gap-1.5 text-xs" onClick={() => handleGenerateOutreach(contact)} disabled={generatingOutreach}>
                  {generatingOutreach ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                  Generate Outreach
                </Button>
              </div>
            </div>
          ))}
          {contacts.length === 0 && !showAddContact && (
            <div className="text-center py-12 text-sm text-gray-400">No contacts added yet. Click "Add Contact" to start.</div>
          )}
        </TabsContent>

        {/* Intelligence Tab */}
        <TabsContent value="intelligence" className="mt-6 space-y-4">
          <div className="bg-white border border-gray-100 rounded-2xl p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Intelligence Signals</h3>
            {(company.intelligence_signals || []).length > 0 ? (
              <div className="space-y-3">
                {company.intelligence_signals.map((signal, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
                    <Zap className="w-4 h-4 text-[#F7931E] mt-0.5 shrink-0" />
                    <p className="text-sm text-gray-700">{signal}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400">No intelligence signals available</p>
            )}
          </div>
        </TabsContent>

        {/* Roles Tab */}
        <TabsContent value="roles" className="mt-6 space-y-4">
          {roles.map(role => (
            <div key={role.id} className="bg-white border border-gray-100 rounded-2xl p-6">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h4 className="font-semibold text-gray-900">{role.title}</h4>
                  <div className="flex flex-wrap gap-2 mt-1 text-sm text-gray-500">
                    {role.location && <span>{role.location}</span>}
                    {role.work_type && <span>• {role.work_type}</span>}
                    {role.source && <span>• {role.source}</span>}
                  </div>
                </div>
                {role.match_score && (
                  <div className="w-10 h-10 bg-orange-50 rounded-lg flex items-center justify-center text-sm font-bold text-[#F7931E]">
                    {role.match_score}%
                  </div>
                )}
              </div>
              {(role.salary_min || role.salary_max) && (
                <p className="text-sm text-gray-600 mb-2">
                  💰 ${role.salary_min?.toLocaleString()} - ${role.salary_max?.toLocaleString()}
                </p>
              )}
              <StatusBadge status={role.status || "new"} />
            </div>
          ))}
          {roles.length === 0 && <div className="text-center py-12 text-sm text-gray-400">No open roles found for this company</div>}
        </TabsContent>

        {/* Outreach Tab */}
        <TabsContent value="outreach" className="mt-6 space-y-4">
          {generatedMessage && (
            <div className="bg-orange-50 border border-orange-100 rounded-2xl p-6 space-y-4">
              <h3 className="font-semibold text-gray-900">Generated Outreach Message</h3>
              <p className="text-sm text-gray-500">To: {generatedMessage.contact.full_name}</p>
              <div className="bg-white rounded-xl p-4 space-y-2">
                <p className="text-sm font-medium">Subject: {generatedMessage.subject}</p>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{generatedMessage.body}</p>
              </div>
              <div className="flex gap-2">
                <Button onClick={saveOutreach} className="bg-[#F7931E] hover:bg-[#E07A0A] text-white rounded-xl gap-2">
                  <Check className="w-4 h-4" /> Save to Outreach
                </Button>
                <Button variant="outline" className="rounded-xl" onClick={() => setGeneratedMessage(null)}>Discard</Button>
              </div>
            </div>
          )}
          <div className="text-center py-8 text-sm text-gray-400">
            Generate outreach from the Contacts tab, or visit the <Link to={createPageUrl("Outreach")} className="text-[#F7931E] hover:underline">Outreach page</Link>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}