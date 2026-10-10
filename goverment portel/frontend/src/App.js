import './App.css';
import { BrowserRouter, Routes, Route } from "react-router-dom";
import DashboardHome from './components/home/Home';
import Login from './components/login/Login'
import DashboardLayout from './components/home/DashboardLayout.js';
import AddState from './components/state/State';
import AddDistrict from './components/District/District.js';
import AddTehsil from './components/Tehsil/Tehsil.js';
import AddFarmer from './components/Farmer/AddFarmer.js';
import Farmer from './components/Farmer/Farmer.js';
import FarmerLand from './components/Farmer/FarmerLand.js';
import Mandis from './components/Mandi/Mandi.js';
import AddMandis from './components/Mandi/AddMandi.js'
import MandiCounters from './components/Mandi/MandiCounter.js';
import Crops from './components/Crop/Crops.js';
import ProcurementSessions from './components/Procurement/ProcurementSession.js';
import ProcurementQuota from './components/Procurement/ProcurementQuota.js';
import Chatbot from './components/Chatbot/Chatbot.js'
import RecentLogs from './components/RecentLogs/RecentLogs.js';
import AddUser from './components/AddUser/AddUser.js';
import User from './components/AddUser/Users.js'
import AddMandiUser from './components/MandiUser/AddMandiUser.js';
import ViewMandiUsers from './components/MandiUser/ViewMandiUsers.js';
import PaymentUsers from './components/PaymentUsers/PaymentUsers.js';
import Profile from './components/Profile/Profile.js';

import AuthState from './context/auth/AuthState';
import StateState from './context/state/StateState.js';
import DistrictState from './context/District/DistrictState.js'
import TehsilState from './context/Tehsil/TehsilState.js';
import InfoState from './context/Info/InfoState.js';
import FarmerState from './context/Farmer/FarmerState.js'
import MandiState from './context/Mandi/MandiState.js'
import CropState from './context/Crop/CropState.js'
import ProcurementState from './context/Procurement/ProcurementState.js';
function App() {
  return (
    <BrowserRouter>
      <AuthState>
        <StateState>
          <DistrictState>
            <TehsilState>
              <FarmerState>
                <MandiState>
                  <CropState>  
                    <ProcurementState>
                      <InfoState>
                        <Routes>
                          <Route path="/" element={<DashboardLayout />}>
                            <Route index element={<DashboardHome />} />
                            <Route path="states" element={<AddState />} />
                            <Route path="districts" element={<AddDistrict/>} />
                            <Route path="tehsils" element={<AddTehsil/>} />
                            <Route path="farmers/register" element={<AddFarmer/>}/>
                            <Route path="farmers" element={<Farmer/>}/>
                            <Route path="mandis" element={<Mandis/>}/>
                            <Route path="mandis/addmandi" element={<AddMandis/>}/>
                            <Route path="crops" element={<Crops/>}/>
                            <Route path="mandi-counters" element={<MandiCounters/>}/>
                            <Route path="farmers/land/:farmerId" element={<FarmerLand />} />
                            <Route path="procurement" element={<ProcurementSessions />} />
                            <Route path="procurementquota" element={<ProcurementQuota />} />
                            <Route path="chatbot" element={<Chatbot />} />
                            <Route path="activities" element={<RecentLogs />} />
                            <Route path="adduser" element={<AddUser />} />
                            <Route path="users" element={<User />} />
                            <Route path="addmandiuser" element={<AddMandiUser />} />
                            <Route path="mandiuser" element={<ViewMandiUsers />} />
                            <Route path="payment-users" element={<PaymentUsers />} />
                            <Route path="profile" element={<Profile />} />
                          </Route>
                          <Route path="/login" element={<Login />} />
                        </Routes>
                      </InfoState>
                    </ProcurementState>    
                  </CropState>
                </MandiState>
              </FarmerState>
            </TehsilState>
          </DistrictState>
        </StateState>
      </AuthState>
    </BrowserRouter>
  );
}

export default App;
