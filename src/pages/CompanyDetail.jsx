import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "../utils";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Loader2, Send } from "lucide-react";
import CompanyHeader from "../components/company/CompanyHeader";
import OverviewTab from "../components/company/OverviewTab";
import ContactCard from "../components/company/ContactCard";
import OutreachComposerModal from "../components/outreach/OutreachComposerModal";

export default function CompanyDetail() {
  const queryClient = useQueryClient();
  const params = new URLSearchParams(window.location.search);
  const companyName = params.get("name");
  const companyIdParam = params.get("id");
  
  const [companyId, setCompanyId] = useState(companyIdParam);
  const [enriching, setEnriching] = useState(!companyIdParam);
  const [generatedMessages, setGeneratedMessages] = useState({});
  const [generatingContactId, setGeneratingContactId] = useState(null);
  const [showOutreachModal, setShowOutreachModal] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

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
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="text-center py-16 text-gray-400">No company selected</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="text-center py-16">
          <p className="text-red-500 font-semibold mb-4">Failed to load company</p>
          <p className="text-gray-500 text-sm">{error.message}</p>
        </div>
      </div>
    );
  }

  if (isLoading || !company) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
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
    <div className="min-h-screen bg-gray-50">
      {/* Breadcrumb */}
      <div className="px-6 py-4 border-b border-gray-200 bg-white sticky top-16 z-40">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Link to={createPageUrl("Discover")} className="hover:text-gray-900">Discover</Link>
          <span>/</span>
          <span className="text-gray-900 font-medium">{company.name}</span>
        </div>
      </div>

      {/* Header with Outreach Button */}
      <div className="px-6 py-4 bg-white border-b border-gray-200 flex items-center justify-between">
        <CompanyHeader company={company} enriching={enriching} />
      </div>

      {/* Tabs */}
      <div className="px-6 py-6">
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="bg-white border border-gray-200 rounded-xl p-1">
            <TabsTrigger value="overview" className="rounded-lg data-[state=active]:bg-gray-100">Overview</TabsTrigger>
            <TabsTrigger value="contacts" className="rounded-lg data-[state=active]:bg-gray-100">
              Decision Makers ({contacts.length})
            </TabsTrigger>
            <TabsTrigger value="intelligence" className="rounded-lg data-[state=active]:bg-gray-100">Intelligence</TabsTrigger>
            <TabsTrigger value="roles" className="rounded-lg data-[state=active]:bg-gray-100">
              Open Roles ({roles.length})
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <OverviewTab company={company} roles={roles} />
          </TabsContent>

          {/* Contacts Tab */}
          <TabsContent value="contacts" className="space-y-4">
            {contacts.length === 0 ? (
              <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
                <p className="text-gray-600 mb-4">No decision makers identified yet</p>
                <div className="flex gap-3 justify-center">
                  <Button
                    onClick={async () => {
                      try {
                        const result = await base44.functions.invoke('findContacts', {
                          companyDomain: company.domain,
                          companyName: company.name,
                          titles: ['CEO', 'CTO', 'COO', 'CFO', 'VP', 'Director']
                        });
                        
                        const contactsList = Array.isArray(result.data) ? result.data : (result.data?.contacts || []);
                        
                        if (contactsList.length > 0) {
                          for (const contact of contactsList) {
                            await base44.entities.Contact.create({
                              ...contact,
                              company_id: companyId,
                              company_name: company.name
                            });
                          }
                          queryClient.invalidateQueries({ queryKey: ["contacts", companyId] });
                        } else {
                          alert('No decision makers found for this company');
                        }
                      } catch (error) {
                        console.error('Error:', error);
                        alert('Failed to find decision makers. Please try again.');
                      }
                    }}
                    className="bg-orange-600 hover:bg-orange-700 text-white"
                  >
                    Find Decision Makers
                  </Button>
                  <Button
                    onClick={() => setShowOutreachModal(true)}
                    variant="outline"
                  >
                    Draft Outreach (No Contacts)
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Decision Makers</h3>
                  <Button
                    onClick={() => setShowOutreachModal(true)}
                    className="bg-orange-600 hover:bg-orange-700 text-white gap-2"
                  >
                    <Send className="w-4 h-4" />
                    Draft Outreach
                  </Button>
                </div>
                {contacts.map(contact => (
                  <ContactCard
                    key={contact.id}
                    contact={contact}
                    generatedMessage={generatedMessages[contact.id]}
                    onGenerateMessage={() => handleGenerateMessage(contact)}
                    onManualApply={handleManualApply}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          {/* Intelligence Tab */}
          <TabsContent value="intelligence">
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Intelligence Signals</h3>
              {(company.intelligence_signals || []).length > 0 ? (
                <div className="space-y-2">
                  {company.intelligence_signals.map((signal, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm text-gray-700">
                      <span className="text-orange-600 mt-0.5">•</span>
                      <span>{signal}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No intelligence signals available</p>
              )}
            </div>
          </TabsContent>

          {/* Roles Tab */}
          <TabsContent value="roles" className="space-y-3">
            {roles.length === 0 ? (
              <div className="bg-white border border-gray-200 rounded-xl p-8 text-center text-gray-500">
                No open roles found
              </div>
            ) : (
              roles.map(role => (
                <div key={role.id} className="bg-white border border-gray-200 rounded-xl p-5">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h4 className="font-semibold text-gray-900">{role.title}</h4>
                      <p className="text-sm text-gray-600">{role.location || 'Remote'}</p>
                    </div>
                    {role.match_score && <div className="text-sm font-bold text-orange-600">{role.match_score}%</div>}
                  </div>
                  {(role.salary_min || role.salary_max) && (
                    <p className="text-sm text-gray-600">
                      ${(role.salary_min / 1000).toFixed(0)}K - ${(role.salary_max / 1000).toFixed(0)}K
                    </p>
                  )}
                </div>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Outreach Composer Modal */}
      {showOutreachModal && user && (
        <OutreachComposerModal
          company={company}
          contacts={contacts}
          roles={roles}
          user={user}
          onClose={() => setShowOutreachModal(false)}
        />
      )}
    </div>
  );
}