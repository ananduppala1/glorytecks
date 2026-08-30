import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { ProtectedRoute } from '@/routes/ProtectedRoute';
import { useAuth } from '@/context/AuthContext';
import { ROLE_HOME } from '@/lib/nav';
import { LoginPage } from '@/pages/Login';
import { DashboardPage } from '@/pages/Dashboard';
import { BlogListPage } from '@/pages/blogs/BlogList';
import { BlogEditorPage } from '@/pages/blogs/BlogEditor';
import { CourseListPage } from '@/pages/courses/CourseList';
import { CourseFormPage } from '@/pages/courses/CourseForm';
import { EnquiryListPage } from '@/pages/leads/EnquiryList';
import { DemoRequestListPage } from '@/pages/leads/DemoRequestList';
import { SettingsPage } from '@/pages/Settings';
import { HomeHeroPage } from '@/pages/HomeHero';
import { AboutPageEditor } from '@/pages/AboutPage';
import { ProfilePage } from '@/pages/Profile';
import { AdminUsersPage } from '@/pages/AdminUsers';
import { NotFoundPage } from '@/pages/NotFound';
import { ResourcePage } from '@/features/ResourcePage';
import {
  categoryConfig,
  authorConfig,
  trainerConfig,
  testimonialConfig,
  placementConfig,
  companyConfig,
  roadmapConfig,
  faqConfig,
  comparisonConfig,
  localityConfig,
  legalConfig,
  galleryConfig,
  brochureConfig,
  batchConfig,
} from '@/features/resourceConfigs';

/**
 * Landing route ("/"). Admin (and legacy roles) see the Dashboard; restricted
 * roles are redirected to their home page so they never see a page they can't use.
 */
function RoleHome() {
  const { user } = useAuth();
  const target = user ? ROLE_HOME[user.role] : undefined;
  if (target) return <Navigate to={target} replace />;
  return <DashboardPage />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        {/* Authenticated app */}
        <Route element={<ProtectedRoute />}>
          <Route element={<AppShell />}>
            <Route index element={<RoleHome />} />

            {/* Content + People & Proof — admins and content writers */}
            <Route element={<ProtectedRoute roles={['admin', 'content_writer']} />}>
              <Route path="blogs" element={<BlogListPage />} />
              <Route path="blogs/new" element={<BlogEditorPage />} />
              <Route path="blogs/:id" element={<BlogEditorPage />} />
              <Route path="courses" element={<CourseListPage />} />
              <Route path="courses/new" element={<CourseFormPage />} />
              <Route path="courses/:id" element={<CourseFormPage />} />
              <Route path="categories" element={<ResourcePage key="categories" config={categoryConfig} />} />
              <Route path="authors" element={<ResourcePage key="authors" config={authorConfig} />} />

              <Route path="trainers" element={<ResourcePage key="trainers" config={trainerConfig} />} />
              <Route path="testimonials" element={<ResourcePage key="testimonials" config={testimonialConfig} />} />
              <Route path="placements" element={<ResourcePage key="placements" config={placementConfig} />} />
              <Route path="companies" element={<ResourcePage key="companies" config={companyConfig} />} />
            </Route>

            {/* Leads — admins and receptionists */}
            <Route element={<ProtectedRoute roles={['admin', 'receptionist']} />}>
              <Route path="enquiries" element={<EnquiryListPage />} />
              <Route path="demo-requests" element={<DemoRequestListPage />} />
            </Route>

            {/* Account — any authenticated user */}
            <Route path="profile" element={<ProfilePage />} />

            {/* Site content & system — admin only */}
            <Route element={<ProtectedRoute roles={['admin']} />}>
              <Route path="home-hero" element={<HomeHeroPage />} />
              <Route path="about-us" element={<AboutPageEditor />} />
              <Route path="roadmaps" element={<ResourcePage key="roadmaps" config={roadmapConfig} />} />
              <Route path="faqs" element={<ResourcePage key="faqs" config={faqConfig} />} />
              <Route path="comparisons" element={<ResourcePage key="comparisons" config={comparisonConfig} />} />
              <Route path="localities" element={<ResourcePage key="localities" config={localityConfig} />} />
              <Route path="legal" element={<ResourcePage key="legal" config={legalConfig} />} />
              <Route path="gallery" element={<ResourcePage key="gallery" config={galleryConfig} />} />
              <Route path="brochures" element={<ResourcePage key="brochures" config={brochureConfig} />} />
              <Route path="batches" element={<ResourcePage key="batches" config={batchConfig} />} />

              <Route path="settings" element={<SettingsPage />} />
              <Route path="admins" element={<AdminUsersPage />} />
            </Route>

            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
