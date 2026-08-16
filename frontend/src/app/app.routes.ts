import { Routes } from '@angular/router';
import { HomeComponent } from './home.component';
import { MushafComponent } from './mushaf.component';
import { LessonsComponent } from './lessons.component';
import { PracticeComponent } from './practice.component';
import { IndexComponent } from './index.component';
import { SearchComponent } from './search.component';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'read', component: MushafComponent },
  { path: 'index', component: IndexComponent },
  { path: 'search', component: SearchComponent },
  { path: 'lessons', component: LessonsComponent },
  { path: 'practice', component: PracticeComponent },
  { path: '**', redirectTo: '' }
];
