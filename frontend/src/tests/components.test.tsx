import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Stepper } from "@/components/ui/stepper";
import { CapabilityBanner } from "@/components/ui/capability-banner";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableFooter, TableCaption } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { Select, SelectGroup, SelectValue, SelectTrigger, SelectContent, SelectLabel, SelectItem, SelectSeparator } from "@/components/ui/select";
import { Toaster } from "@/components/ui/toast";
import { Users, Sparkles } from "lucide-react";

describe("Accessible UI Components Suite", () => {
  it("renders Badge variants correctly", () => {
    const { rerender } = render(<Badge variant="default">Active</Badge>);
    expect(screen.getByText("Active")).toBeDefined();

    rerender(<Badge variant="outline">Outline</Badge>);
    expect(screen.getByText("Outline")).toBeDefined();

    rerender(<Badge variant="success">Completed</Badge>);
    expect(screen.getByText("Completed")).toBeDefined();
  });

  it("renders Button and handles click events", () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click Me</Button>);
    const btn = screen.getByText("Click Me");
    fireEvent.click(btn);
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it("renders Input with placeholder and value", () => {
    const handleChange = vi.fn();
    render(<Input placeholder="Search..." onChange={handleChange} />);
    const input = screen.getByPlaceholderText("Search...");
    expect(input).toBeDefined();
    fireEvent.change(input, { target: { value: "Engineering" } });
    expect(handleChange).toHaveBeenCalled();
  });

  it("renders Card layout with all subcomponents", () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Test Card Title</CardTitle>
          <CardDescription>Test Description</CardDescription>
        </CardHeader>
        <CardContent>
          <p>Test Body Content</p>
        </CardContent>
        <CardFooter>
          <span>Footer Note</span>
        </CardFooter>
      </Card>
    );
    expect(screen.getByText("Test Card Title")).toBeDefined();
    expect(screen.getByText("Test Description")).toBeDefined();
    expect(screen.getByText("Test Body Content")).toBeDefined();
    expect(screen.getByText("Footer Note")).toBeDefined();
  });

  it("renders EmptyState with icon, title, description, and action button", () => {
    const handleAction = vi.fn();
    render(
      <EmptyState
        icon={Users}
        title="No Contacts Found"
        description="Try adjusting your search criteria."
        action={<Button onClick={handleAction}>Import Contacts</Button>}
      />
    );
    expect(screen.getByText("No Contacts Found")).toBeDefined();
    expect(screen.getByText("Try adjusting your search criteria.")).toBeDefined();
    const actionBtn = screen.getByText("Import Contacts");
    fireEvent.click(actionBtn);
    expect(handleAction).toHaveBeenCalledTimes(1);
  });

  it("renders PageHeader with breadcrumbs, actions, and badge", () => {
    render(
      <PageHeader
        title="Message Studio"
        description="Personalize and review AI drafts"
        badge={<Badge>Beta</Badge>}
        breadcrumbs={[
          { label: "Dashboard", href: "/overview" },
          { label: "Studio" },
        ]}
        actions={<Button>Create Draft</Button>}
      />
    );
    expect(screen.getByText("Message Studio")).toBeDefined();
    expect(screen.getByText("Personalize and review AI drafts")).toBeDefined();
    expect(screen.getByText("Beta")).toBeDefined();
    expect(screen.getByText("Dashboard")).toBeDefined();
    expect(screen.getByText("Studio")).toBeDefined();
    expect(screen.getByText("Create Draft")).toBeDefined();
  });

  it("renders StatCard with value, label, and trend", () => {
    render(
      <StatCard
        label="High Priority"
        value={42}
        icon={Sparkles}
        description="Scored >= 70"
        trend={{ value: "+12%", positive: true }}
      />
    );
    expect(screen.getByText("High Priority")).toBeDefined();
    expect(screen.getByText("42")).toBeDefined();
    expect(screen.getByText("Scored >= 70")).toBeDefined();
  });

  it("renders Stepper across steps and indicates current step", () => {
    const steps = [
      { id: "1", label: "Step 1", description: "First" },
      { id: "2", label: "Step 2", description: "Second" },
      { id: "3", label: "Step 3", description: "Third" },
    ];
    render(<Stepper steps={steps} currentStep={1} />);
    expect(screen.getByText("Step 1")).toBeDefined();
    expect(screen.getByText("Step 2")).toBeDefined();
    expect(screen.getByText("Step 3")).toBeDefined();
  });

  it("renders CapabilityBanner with policy guarantee", () => {
    render(<CapabilityBanner />);
    expect(screen.getByText("Manual Sending Mode Active:")).toBeDefined();
  });

  it("renders Checkbox and toggles state", () => {
    const handleChecked = vi.fn();
    render(<Checkbox aria-label="Accept terms" onCheckedChange={handleChecked} />);
    const cb = screen.getByRole("checkbox");
    expect(cb).toBeDefined();
    fireEvent.click(cb);
    expect(handleChecked).toHaveBeenCalledWith(true);
  });

  it("renders Switch and toggles state", () => {
    const handleSwitch = vi.fn();
    render(<Switch aria-label="Toggle notifications" onCheckedChange={handleSwitch} />);
    const sw = screen.getByRole("switch");
    expect(sw).toBeDefined();
    fireEvent.click(sw);
    expect(handleSwitch).toHaveBeenCalledWith(true);
  });

  it("renders Progress bar with value", () => {
    render(<Progress value={65} aria-label="Upload progress" />);
    const progress = screen.getByRole("progressbar");
    expect(progress).toBeDefined();
  });

  it("renders Skeleton loading placeholder", () => {
    const { container } = render(<Skeleton className="h-4 w-32" />);
    expect(container.firstChild).toBeDefined();
  });

  it("renders Table and all table sub-elements", () => {
    render(
      <Table>
        <TableCaption>A list of recent connections</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Company</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell>Alice Smith</TableCell>
            <TableCell>Acme Corp</TableCell>
          </TableRow>
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell colSpan={2}>Total: 1</TableCell>
          </TableRow>
        </TableFooter>
      </Table>
    );
    expect(screen.getByText("Alice Smith")).toBeDefined();
    expect(screen.getByText("Acme Corp")).toBeDefined();
    expect(screen.getByText("A list of recent connections")).toBeDefined();
    expect(screen.getByText("Total: 1")).toBeDefined();
  });

  it("renders Tabs with tab triggers and active content", () => {
    render(
      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">All Contacts</TabsTrigger>
          <TabsTrigger value="saved">Saved</TabsTrigger>
        </TabsList>
        <TabsContent value="all">
          <p>Displaying all contacts</p>
        </TabsContent>
        <TabsContent value="saved">
          <p>Displaying saved contacts</p>
        </TabsContent>
      </Tabs>
    );
    expect(screen.getByText("All Contacts")).toBeDefined();
    expect(screen.getByText("Displaying all contacts")).toBeDefined();
  });

  it("renders Tooltip components", () => {
    render(
      <TooltipProvider>
        <Tooltip open={true}>
          <TooltipTrigger asChild>
            <button>Hover Me</button>
          </TooltipTrigger>
          <TooltipContent>
            <span>Tooltip info</span>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
    expect(screen.getByText("Hover Me")).toBeDefined();
    expect(screen.getByText("Tooltip info")).toBeDefined();
  });

  it("renders Dialog with title and content", () => {
    render(
      <Dialog open={true}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Action</DialogTitle>
            <DialogDescription>Are you sure you want to proceed?</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button>Confirm</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
    expect(screen.getByText("Confirm Action")).toBeDefined();
    expect(screen.getByText("Are you sure you want to proceed?")).toBeDefined();
    expect(screen.getByText("Confirm")).toBeDefined();
  });

  it("renders ConfirmDialog and processes confirmation", () => {
    const handleConfirm = vi.fn();
    const handleOpenChange = vi.fn();
    render(
      <ConfirmDialog
        open={true}
        onOpenChange={handleOpenChange}
        title="Delete Connection"
        description="Are you sure you want to delete this connection?"
        confirmLabel="Yes, Delete"
        destructive={true}
        onConfirm={handleConfirm}
      />
    );
    expect(screen.getByText("Delete Connection")).toBeDefined();
    expect(screen.getByText("Are you sure you want to delete this connection?")).toBeDefined();
    const confirmBtn = screen.getByText("Yes, Delete");
    fireEvent.click(confirmBtn);
    expect(handleConfirm).toHaveBeenCalledTimes(1);
  });

  it("renders Drawer and displays inner content", () => {
    render(
      <Drawer open={true}>
        <DrawerContent>
          <h2>Scoring Explanation</h2>
          <p>This match is 95% due to shared alumni network.</p>
        </DrawerContent>
      </Drawer>
    );
    expect(screen.getByText("Scoring Explanation")).toBeDefined();
    expect(screen.getByText("This match is 95% due to shared alumni network.")).toBeDefined();
  });

  it("renders Select with trigger and content", () => {
    render(
      <Select defaultValue="eng">
        <SelectTrigger>
          <SelectValue placeholder="Select dept" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectLabel>Departments</SelectLabel>
            <SelectItem value="eng">Engineering</SelectItem>
            <SelectSeparator />
            <SelectItem value="prod">Product</SelectItem>
          </SelectGroup>
        </SelectContent>
      </Select>
    );
    expect(screen.getByText("Engineering")).toBeDefined();
  });

  it("renders Toaster without crashing", () => {
    const { container } = render(<Toaster />);
    expect(container).toBeDefined();
  });
});
