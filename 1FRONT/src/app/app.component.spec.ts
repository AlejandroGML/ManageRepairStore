import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { AppComponent } from './app.component';
import { AuthService } from './services/auth.service';
import { LoadingService } from './services/loading.service';

describe('AppComponent', () => {
  let component: AppComponent;
  let fixture: ComponentFixture<AppComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppComponent, RouterTestingModule.withRoutes([])],
      providers: [provideHttpClient(), provideHttpClientTesting(), AuthService],
    }).compileComponents();

    fixture = TestBed.createComponent(AppComponent);
    component = fixture.componentInstance;
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should create the app', () => {
    expect(component).toBeTruthy();
  });

  it('should render the router outlet (shell handoff)', () => {
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('router-outlet')).not.toBeNull();
  });

  it('should not render the legacy navbar or form components', () => {
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('app-navbar')).toBeNull();
    expect(compiled.querySelector('app-form')).toBeNull();
    expect(compiled.querySelector('app-login')).toBeNull();
  });

  it('should keep checkSessionDay active (interval scheduled)', () => {
    const setIntervalSpy = spyOn(window, 'setInterval').and.returnValue(123 as any);
    fixture.detectChanges();
    expect(setIntervalSpy).toHaveBeenCalledWith(jasmine.any(Function), 1000 * 60);
  });

  it('should show the loading spinner while LoadingService is loading', () => {
    fixture.detectChanges();
    const loadingService = TestBed.inject(LoadingService);
    loadingService.setLoading(true);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.loading')).not.toBeNull();

    loadingService.setLoading(false);
    fixture.detectChanges();
    expect(compiled.querySelector('.loading')).toBeNull();
  });
});
